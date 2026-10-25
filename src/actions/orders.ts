"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ApiError } from "@/lib/api/client";
import type { DiscountInput, Override, PaymentMethod } from "@/lib/api/types";
import { act, billRoles, floorRoles, requireStaff } from "@/lib/session";

const str = (formData: FormData, name: string, max = 200) => String(formData.get(name) ?? "").trim().slice(0, max);
const int = (formData: FormData, name: string) => {
  const raw = str(formData, name, 12).replace(/[,\s৳]/g, "");
  return /^\d+$/.test(raw) ? Number(raw) : NaN;
};
const orderPath = (formData: FormData) => `/orders/${encodeURIComponent(str(formData, "orderId", 64))}`;

/**
 * Back to the page with the error code and which of its forms failed, so plain HTML posts show it.
 * `at` makes every redirect a new URL: dialogs use it to reopen on an error and close on success.
 */
function fail(path: string, error: ApiError | string, form?: string): never {
  const params = new URLSearchParams({ error: typeof error === "string" ? error : error.code, at: String(Date.now()) });
  if (form) params.set("form", form);
  redirect(`${path}?${params}`);
}

/** Success: back to a clean URL with a toast code (see components/ui/toast.tsx). */
function done(path: string, ok: string, extra: Record<string, string> = {}): never {
  const params = new URLSearchParams({ ok, at: String(Date.now()), ...extra });
  redirect(`${path}?${params}`);
}

/** The manager approval fields shown to cashiers and waiters. Empty → no override sent. */
function readOverride(formData: FormData): Override | undefined {
  const username = str(formData, "overrideUsername", 60).toLowerCase();
  const password = str(formData, "overridePassword");
  return username && password ? { username, password } : undefined;
}

export async function openOrder(formData: FormData) {
  await requireStaff({ roles: floorRoles });
  const tableId = str(formData, "tableId", 64) || null;
  const result = await act((api) => api.openOrder(tableId));
  if (result.ok) done(`/orders/${result.data.id}`, "opened", { tab: "add" });
  const existing = result.error.body.orderId;
  if (result.error.code === "table_busy" && typeof existing === "string") redirect(`/orders/${existing}`);
  fail("/floor", result.error);
}

export async function approveRound(formData: FormData) {
  await requireStaff({ roles: floorRoles });
  const path = orderPath(formData);
  const result = await act((api) => api.approveRound(str(formData, "roundId", 64)));
  if (!result.ok) fail(path, result.error, "rounds");
  done(path, "approved");
}

export async function rejectRound(formData: FormData) {
  await requireStaff({ roles: floorRoles });
  const path = orderPath(formData);
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
  const result = await act((api) => api.serveRound(str(formData, "roundId", 64)));
  if (!result.ok) fail(path, result.error, "rounds");
  done(path, "served");
}

export async function cancelItem(formData: FormData) {
  await requireStaff({ roles: floorRoles });
  const path = orderPath(formData);
  const itemId = str(formData, "itemId", 64);
  const reason = str(formData, "reason", 300);
  if (!reason) fail(path, "reason_required", `cancel-${itemId}`);
  const result = await act((api) => api.cancelItem(itemId, reason, readOverride(formData)));
  if (!result.ok) fail(path, result.error, `cancel-${itemId}`);
  done(path, "itemCancelled");
}

export async function cancelOrder(formData: FormData) {
  await requireStaff({ roles: floorRoles });
  const path = orderPath(formData);
  const reason = str(formData, "reason", 300);
  if (!reason) fail(path, "reason_required", "cancel-order");
  const result = await act((api) => api.cancelOrder(str(formData, "orderId", 64), reason, readOverride(formData)));
  if (!result.ok) fail(path, result.error, "cancel-order");
  done("/floor", "orderCancelled", { n: String(result.data.number) });
}

export async function requestBill(formData: FormData) {
  await requireStaff({ roles: floorRoles });
  const path = orderPath(formData);
  const result = await act((api) => api.requestBill(str(formData, "orderId", 64)));
  if (!result.ok) fail(path, result.error, "rounds");
  done(path, "billRequested");
}

export async function applyDiscount(formData: FormData) {
  await requireStaff({ roles: billRoles });
  const path = `${orderPath(formData)}/bill`;
  const value = int(formData, "value");
  const kind = str(formData, "kind", 10) === "percent" ? "percent" : "amount";
  const reason = str(formData, "reason", 300);
  if (Number.isNaN(value) || (kind === "percent" && value > 100)) fail(path, "discount_value", "discount");
  if (!reason && value > 0) fail(path, "reason_required", "discount");
  const override = readOverride(formData);
  const input: DiscountInput = {
    ...(kind === "percent" ? { percent: value } : { amountTaka: value }),
    reason,
    ...(override ? { override } : {}),
  };
  const result = await act((api) => api.discount(str(formData, "orderId", 64), input));
  if (!result.ok) fail(path, result.error, "discount");
  done(path, value > 0 ? "discount" : "discountCleared");
}

const methods: PaymentMethod[] = ["cash", "bkash", "nagad", "card"];

export async function recordPayment(formData: FormData) {
  await requireStaff({ roles: billRoles });
  const path = `${orderPath(formData)}/bill`;
  const method = str(formData, "method", 10) as PaymentMethod;
  const amountTaka = int(formData, "amount");
  const tendered = int(formData, "tendered");
  const reference = str(formData, "reference", 100);
  if (!methods.includes(method)) fail(path, "payment_method", "payment");
  if (Number.isNaN(amountTaka) || amountTaka < 1) fail(path, "payment_amount", "payment");
  if (method === "cash" && !Number.isNaN(tendered) && tendered < amountTaka) fail(path, "tendered_short", "payment");

  const result = await act((api) =>
    api.pay(str(formData, "orderId", 64), {
      method,
      amountTaka,
      ...(method === "cash" && !Number.isNaN(tendered) ? { tenderedTaka: tendered } : {}),
      ...(method !== "cash" && reference ? { reference } : {}),
    }),
  );
  if (!result.ok) fail(path, result.error, "payment");
  const order = result.data;
  if (order.status === "paid") {
    done("/floor", order.tableLabel ? "paidTable" : "paid", {
      n: String(order.number),
      ...(order.tableLabel ? { table: order.tableLabel } : {}),
      receipt: order.id,
    });
  }
  done(path, "payment");
}

export type AddRoundState = { ok?: boolean; error?: string; menuItemId?: string; at?: number } | null;

/**
 * Called by the menu picker with useActionState. On success it refreshes the order page in place
 * (the picker clears its cart); on error it returns the code (and the sold-out dish) for the picker to show.
 */
export async function addRound(_prev: AddRoundState, formData: FormData): Promise<AddRoundState> {
  await requireStaff({ roles: floorRoles });
  const orderId = str(formData, "orderId", 64);
  const clientRequestId = str(formData, "clientRequestId", 100);
  const note = str(formData, "note", 300);
  let items: { menuItemId: string; quantity: number; note?: string }[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("items") ?? "[]")) as unknown;
    if (Array.isArray(parsed)) {
      items = parsed
        .map((raw) => raw as { menuItemId?: unknown; quantity?: unknown; note?: unknown })
        .filter((i) => typeof i.menuItemId === "string" && Number.isInteger(i.quantity))
        .slice(0, 50)
        .map((i) => ({
          menuItemId: String(i.menuItemId),
          quantity: Math.min(50, Math.max(1, Number(i.quantity))),
          ...(typeof i.note === "string" && i.note.trim() ? { note: i.note.trim().slice(0, 300) } : {}),
        }));
    }
  } catch {
    items = [];
  }
  if (!items.length) return { error: "cart_empty", at: Date.now() };
  if (clientRequestId.length < 8) return { error: "unknown", at: Date.now() };

  const result = await act((api) => api.addRound(orderId, { items, clientRequestId, ...(note ? { note } : {}) }));
  if (!result.ok) {
    // item_unavailable names the dish in errors[]: as the field itself, or as the message of a menuItemId field.
    const ids = new Set(items.map((i) => i.menuItemId));
    const hit = result.error.errors
      .map((e) => (ids.has(e.field) ? e.field : ids.has(e.message) ? e.message : undefined))
      .find(Boolean);
    refresh();
    return { error: result.error.code, menuItemId: hit, at: Date.now() };
  }
  refresh();
  return { ok: true, at: Date.now() };
}
