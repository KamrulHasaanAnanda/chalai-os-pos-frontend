"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ApiError } from "@/lib/api/client";
import type { DiscountInput, PaymentMethod, Restaurant } from "@/lib/api/types";
import { int, readOverride, readRoundItems, str } from "@/lib/form-data";
import { act, billRoles, floorRoles, requireStaff } from "@/lib/session";

const orderPath = (formData: FormData) =>
  `/orders/${encodeURIComponent(str(formData, "orderId", 64))}`;

/** Approve / reject also run from the Incoming screen (`back=incoming`), which they return to. */
const roundPath = (formData: FormData) =>
  str(formData, "back", 16) === "incoming" ? "/incoming" : orderPath(formData);

/**
 * Back to the page with the error code and which of its forms failed, so plain HTML posts show it.
 * `at` makes every redirect a new URL: dialogs use it to reopen on an error and close on success.
 */
function fail(path: string, error: ApiError | string, form?: string): never {
  const params = new URLSearchParams({
    error: typeof error === "string" ? error : error.code,
    at: String(Date.now()),
  });
  if (form) params.set("form", form);
  redirect(`${path}?${params}`);
}

/** Success: back to a clean URL with a toast code (see components/ui/toast.tsx). */
function done(
  path: string,
  ok: string,
  extra: Record<string, string> = {},
): never {
  const params = new URLSearchParams({ ok, at: String(Date.now()), ...extra });
  redirect(`${path}?${params}`);
}

export async function openOrder(formData: FormData) {
  await requireStaff({ roles: floorRoles });
  const tableId = str(formData, "tableId", 64) || null;
  const result = await act((api) => api.openOrder(tableId));
  if (result.ok) done(`/orders/${result.data.id}`, "opened", { tab: "add" });
  const existing = result.error.body.orderId;
  if (result.error.code === "table_busy" && typeof existing === "string")
    redirect(`/orders/${existing}`);
  fail(formData.get("back") === "/tables" ? "/tables" : "/floor", result.error);
}

export async function approveRound(formData: FormData) {
  const { restaurant } = await requireStaff({ roles: floorRoles });
  const path = roundPath(formData);
  const roundId = str(formData, "roundId", 64);
  const result = await act((api) => api.approveRound(roundId));
  if (!result.ok) fail(path, result.error, "rounds");
  // The approving POS prints the KOT when the restaurant prints them (components/print/kot-printer.tsx).
  done(path, "approved", printsKot(restaurant) ? { print: roundId } : {});
}

export async function rejectRound(formData: FormData) {
  await requireStaff({ roles: floorRoles });
  const path = roundPath(formData);
  const roundId = str(formData, "roundId", 64);
  const reason = str(formData, "reason", 300);
  if (!reason) fail(path, "reason_required", `reject-${roundId}`);
  const result = await act((api) => api.rejectRound(roundId, reason));
  if (!result.ok) fail(path, result.error, `reject-${roundId}`);
  done(path, "rejected");
}

export async function serveRound(formData: FormData) {
  await requireStaff({ roles: floorRoles });
  const path = orderPath(formData);
  const result = await act((api) =>
    api.serveRound(str(formData, "roundId", 64)),
  );
  if (!result.ok) fail(path, result.error, "rounds");
  done(path, "served");
}

export async function cancelItem(formData: FormData) {
  await requireStaff({ roles: floorRoles });
  const path = orderPath(formData);
  const itemId = str(formData, "itemId", 64);
  const reason = str(formData, "reason", 300);
  if (!reason) fail(path, "reason_required", `cancel-${itemId}`);
  const result = await act((api) =>
    api.cancelItem(itemId, reason, readOverride(formData)),
  );
  if (!result.ok) fail(path, result.error, `cancel-${itemId}`);
  done(path, "itemCancelled");
}

export async function cancelOrder(formData: FormData) {
  await requireStaff({ roles: floorRoles });
  const path = orderPath(formData);
  const reason = str(formData, "reason", 300);
  if (!reason) fail(path, "reason_required", "cancel-order");
  const result = await act((api) =>
    api.cancelOrder(
      str(formData, "orderId", 64),
      reason,
      readOverride(formData),
    ),
  );
  if (!result.ok) fail(path, result.error, "cancel-order");
  done("/floor", "orderCancelled", { n: String(result.data.number) });
}

/** Folds this table's order into another open table's (merge tables spec). Goes to the merged order. */
export async function mergeOrder(formData: FormData) {
  await requireStaff({ roles: floorRoles });
  const path = orderPath(formData);
  const into = str(formData, "intoOrderId", 64);
  if (!into) fail(path, "merge_target_required", "merge-order");
  const result = await act((api) => api.mergeOrder(str(formData, "orderId", 64), into));
  if (!result.ok) fail(path, result.error, "merge-order");
  done(`/orders/${result.data.id}`, "merged", { n: String(result.data.number) });
}

export async function requestBill(formData: FormData) {
  await requireStaff({ roles: floorRoles });
  const path = orderPath(formData);
  const result = await act((api) =>
    api.requestBill(str(formData, "orderId", 64)),
  );
  if (!result.ok) fail(path, result.error, "rounds");
  done(path, "billRequested");
}

export async function applyDiscount(formData: FormData) {
  await requireStaff({ roles: billRoles });
  const path = `${orderPath(formData)}/bill`;
  const value = int(formData, "value");
  const kind = str(formData, "kind", 10) === "percent" ? "percent" : "amount";
  const reason = str(formData, "reason", 300);
  if (Number.isNaN(value) || (kind === "percent" && value > 100))
    fail(path, "discount_value", "discount");
  if (!reason && value > 0) fail(path, "reason_required", "discount");
  const override = readOverride(formData);
  const input: DiscountInput = {
    ...(kind === "percent" ? { percent: value } : { amountTaka: value }),
    reason,
    ...(override ? { override } : {}),
  };
  const result = await act((api) =>
    api.discount(str(formData, "orderId", 64), input),
  );
  if (!result.ok) fail(path, result.error, "discount");
  done(path, value > 0 ? "discount" : "discountCleared");
}

/** Spends the attached customer's loyalty points on the bill (one point = ৳1 off). */
export async function spendPoints(formData: FormData) {
  await requireStaff({ roles: billRoles });
  const path = `${orderPath(formData)}/bill`;
  const points = int(formData, "points");
  if (!Number.isInteger(points) || points <= 0)
    fail(path, "bad_points", "loyalty");
  const result = await act((api) =>
    api.spendPoints(str(formData, "orderId", 64), points),
  );
  if (!result.ok) fail(path, result.error, "loyalty");
  done(
    path,
    result.data.status === "paid" ? "paid" : "pointsUsed",
    result.data.status === "paid" ? { n: String(result.data.number) } : {},
  );
}

/** Takes the loyalty discount off the bill; the points go back to the customer. */
export async function returnPoints(formData: FormData) {
  await requireStaff({ roles: billRoles });
  const path = `${orderPath(formData)}/bill`;
  const result = await act((api) =>
    api.returnPoints(str(formData, "orderId", 64)),
  );
  if (!result.ok) fail(path, result.error, "loyalty");
  done(path, "pointsReturned");
}

/** A coupon code on the bill (rules in the API: src/coupons/coupon-rules.ts). From the order page or the bill page. */
export async function applyCoupon(formData: FormData) {
  await requireStaff({ roles: billRoles });
  const path = couponPath(formData);
  const code = str(formData, "code", 40).trim();
  if (!code) fail(path, "coupon_not_found", "coupon");
  const result = await act((api) =>
    api.applyCoupon(str(formData, "orderId", 64), code),
  );
  if (!result.ok) fail(path, result.error, "coupon");
  done(
    path,
    result.data.status === "paid" ? "paid" : "couponApplied",
    result.data.status === "paid" ? { n: String(result.data.number) } : {},
  );
}

export async function removeCoupon(formData: FormData) {
  await requireStaff({ roles: billRoles });
  const path = couponPath(formData);
  const result = await act((api) =>
    api.removeCoupon(str(formData, "orderId", 64)),
  );
  if (!result.ok) fail(path, result.error, "coupon");
  done(path, "couponRemoved");
}

const couponPath = (formData: FormData) =>
  str(formData, "back", 8) === "bill"
    ? `${orderPath(formData)}/bill`
    : orderPath(formData);

const methods: PaymentMethod[] = ["cash", "bkash", "nagad", "card"];

export async function recordPayment(formData: FormData) {
  await requireStaff({ roles: billRoles });
  const path = `${orderPath(formData)}/bill`;
  const method = str(formData, "method", 10) as PaymentMethod;
  const amountTaka = int(formData, "amount");
  const tendered = int(formData, "tendered");
  const reference = str(formData, "reference", 100);
  const guestName = str(formData, "guestName", 80);
  const guestPhone = str(formData, "guestPhone", 20);
  if (!methods.includes(method)) fail(path, "payment_method", "payment");
  if (Number.isNaN(amountTaka) || amountTaka < 1)
    fail(path, "payment_amount", "payment");
  if (method === "cash" && !Number.isNaN(tendered) && tendered < amountTaka)
    fail(path, "tendered_short", "payment");

  const result = await act((api) =>
    api.pay(str(formData, "orderId", 64), {
      method,
      amountTaka,
      ...(method === "cash" && !Number.isNaN(tendered)
        ? { tenderedTaka: tendered }
        : {}),
      ...(method !== "cash" && reference ? { reference } : {}),
      ...(guestName ? { guestName } : {}),
      ...(guestPhone ? { guestPhone } : {}),
    }),
  );
  if (!result.ok) fail(path, result.error, "payment");
  const order = result.data;
  if (order.status === "paid") {
    const tendered = int(formData, "tendered");
    const amountTaka = int(formData, "amount");
    const change =
      method === "cash" && !Number.isNaN(tendered) && !Number.isNaN(amountTaka)
        ? Math.max(0, tendered - amountTaka)
        : 0;
    done(path, "paidSuccess", {
      change: String(change),
      receipt: order.id,
    });
  }
  done(path, "payment");
}

/** The restaurant wants paper KOTs from the POS that sends a round (setting `kot_output`). */
function printsKot(restaurant: Restaurant): boolean {
  return restaurant.kotOutput === "printer" || restaurant.kotOutput === "both";
}

export type AddRoundState = {
  ok?: boolean;
  /** The round just sent, when this POS should print its KOT. */
  printRoundId?: string;
  error?: string;
  menuItemId?: string;
  at?: number;
} | null;

/**
 * Called by the menu picker with useActionState. On success it refreshes the order page in place
 * (the picker clears its cart); on error it returns the code (and the sold-out dish) for the picker to show.
 */
export async function addRound(
  _prev: AddRoundState,
  formData: FormData,
): Promise<AddRoundState> {
  const { restaurant } = await requireStaff({ roles: floorRoles });
  const orderId = str(formData, "orderId", 64);
  const clientRequestId = str(formData, "clientRequestId", 100);
  const note = str(formData, "note", 300);
  const items = readRoundItems(formData);
  if (!items.length) return { error: "cart_empty", at: Date.now() };
  if (clientRequestId.length < 8) return { error: "unknown", at: Date.now() };

  const result = await act((api) =>
    api.addRound(orderId, {
      items,
      clientRequestId,
      ...(note ? { note } : {}),
    }),
  );
  if (!result.ok) {
    // item_unavailable names the dish in errors[]: as the field itself, or as the message of a menuItemId field.
    const ids = new Set(items.map((i) => i.menuItemId));
    const hit = result.error.errors
      .map((e) =>
        ids.has(e.field) ? e.field : ids.has(e.message) ? e.message : undefined,
      )
      .find(Boolean);
    refresh();
    return { error: result.error.code, menuItemId: hit, at: Date.now() };
  }
  refresh();
  const sent = result.data.rounds.at(-1);
  return {
    ok: true,
    at: Date.now(),
    ...(sent && printsKot(restaurant) ? { printRoundId: sent.id } : {}),
  };
}
