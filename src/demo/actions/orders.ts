// Frontend-only demo: browser version of src/actions/orders.ts (next.config.ts aliases it). Same form fields, checks
// and redirects; the API calls go to the demo store (src/demo/api.ts).
import type { DiscountInput, PaymentMethod } from "@/lib/api/types";
import { act, demoApi, type DemoApiError } from "@/demo/api";
import { go } from "@/demo/navigation";
import { int, readOverride, readRoundItems, str } from "@/lib/form-data";
import { orderHref, withParams } from "@/lib/paths";

const orderPath = (formData: FormData, page?: "bill") => orderHref(str(formData, "orderId", 64), page);

/** Back to the page with the error code and which of its forms failed (see src/actions/orders.ts). */
function fail(path: string, error: DemoApiError | string, form?: string) {
  go(withParams(path, { error: typeof error === "string" ? error : error.code, at: String(Date.now()), ...(form ? { form } : {}) }));
}

/** Success: back to the page with a toast code (see components/ui/toast.tsx). */
function done(path: string, ok: string, extra: Record<string, string> = {}) {
  go(withParams(path, { ok, at: String(Date.now()), ...extra }));
}

export async function openOrder(formData: FormData) {
  const tableId = str(formData, "tableId", 64) || null;
  const result = act(() => demoApi.openOrder(tableId));
  if (result.ok) return done(orderHref(result.data.id), "opened", { tab: "add" });
  const existing = result.error.body.orderId;
  if (result.error.code === "table_busy" && typeof existing === "string") return go(orderHref(existing));
  fail("/floor", result.error);
}

export async function approveRound(formData: FormData) {
  const path = orderPath(formData);
  const result = act(() => demoApi.approveRound(str(formData, "roundId", 64)));
  if (!result.ok) return fail(path, result.error, "rounds");
  done(path, "approved");
}

export async function rejectRound(formData: FormData) {
  const path = orderPath(formData);
  const roundId = str(formData, "roundId", 64);
  const reason = str(formData, "reason", 300);
  if (!reason) return fail(path, "reason_required", `reject-${roundId}`);
  const result = act(() => demoApi.rejectRound(roundId, reason));
  if (!result.ok) return fail(path, result.error, `reject-${roundId}`);
  done(path, "rejected");
}

export async function serveRound(formData: FormData) {
  const path = orderPath(formData);
  const result = act(() => demoApi.serveRound(str(formData, "roundId", 64)));
  if (!result.ok) return fail(path, result.error, "rounds");
  done(path, "served");
}

export async function cancelItem(formData: FormData) {
  const path = orderPath(formData);
  const itemId = str(formData, "itemId", 64);
  const reason = str(formData, "reason", 300);
  if (!reason) return fail(path, "reason_required", `cancel-${itemId}`);
  const result = act(() => demoApi.cancelItem(itemId, reason, readOverride(formData)));
  if (!result.ok) return fail(path, result.error, `cancel-${itemId}`);
  done(path, "itemCancelled");
}

export async function cancelOrder(formData: FormData) {
  const path = orderPath(formData);
  const reason = str(formData, "reason", 300);
  if (!reason) return fail(path, "reason_required", "cancel-order");
  const result = act(() => demoApi.cancelOrder(str(formData, "orderId", 64), reason, readOverride(formData)));
  if (!result.ok) return fail(path, result.error, "cancel-order");
  done("/floor", "orderCancelled", { n: String(result.data.number) });
}

export async function requestBill(formData: FormData) {
  const path = orderPath(formData);
  const result = act(() => demoApi.requestBill(str(formData, "orderId", 64)));
  if (!result.ok) return fail(path, result.error, "rounds");
  done(path, "billRequested");
}

export async function applyDiscount(formData: FormData) {
  const path = orderPath(formData, "bill");
  const value = int(formData, "value");
  const kind = str(formData, "kind", 10) === "percent" ? "percent" : "amount";
  const reason = str(formData, "reason", 300);
  if (Number.isNaN(value) || (kind === "percent" && value > 100)) return fail(path, "discount_value", "discount");
  if (!reason && value > 0) return fail(path, "reason_required", "discount");
  const override = readOverride(formData);
  const input: DiscountInput = {
    ...(kind === "percent" ? { percent: value } : { amountTaka: value }),
    reason,
    ...(override ? { override } : {}),
  };
  const result = act(() => demoApi.discount(str(formData, "orderId", 64), input));
  if (!result.ok) return fail(path, result.error, "discount");
  done(path, value > 0 ? "discount" : "discountCleared");
}

const methods: PaymentMethod[] = ["cash", "bkash", "nagad", "card"];

export async function recordPayment(formData: FormData) {
  const path = orderPath(formData, "bill");
  const method = str(formData, "method", 10) as PaymentMethod;
  const amountTaka = int(formData, "amount");
  const tendered = int(formData, "tendered");
  const reference = str(formData, "reference", 100);
  if (!methods.includes(method)) return fail(path, "payment_method", "payment");
  if (Number.isNaN(amountTaka) || amountTaka < 1) return fail(path, "payment_amount", "payment");
  if (method === "cash" && !Number.isNaN(tendered) && tendered < amountTaka) return fail(path, "tendered_short", "payment");

  const result = act(() =>
    demoApi.pay(str(formData, "orderId", 64), {
      method,
      amountTaka,
      ...(method === "cash" && !Number.isNaN(tendered) ? { tenderedTaka: tendered } : {}),
      ...(method !== "cash" && reference ? { reference } : {}),
    }),
  );
  if (!result.ok) return fail(path, result.error, "payment");
  const order = result.data;
  if (order.status === "paid") {
    return done("/floor", order.tableLabel ? "paidTable" : "paid", {
      n: String(order.number),
      ...(order.tableLabel ? { table: order.tableLabel } : {}),
      receipt: order.id,
    });
  }
  done(path, "payment");
}

export type AddRoundState = { ok?: boolean; error?: string; menuItemId?: string; at?: number } | null;

/** Called by the menu picker with useActionState; the store re-renders the order, so no redirect. */
export async function addRound(_prev: AddRoundState, formData: FormData): Promise<AddRoundState> {
  const orderId = str(formData, "orderId", 64);
  const clientRequestId = str(formData, "clientRequestId", 100);
  const note = str(formData, "note", 300);
  const items = readRoundItems(formData);
  if (!items.length) return { error: "cart_empty", at: Date.now() };
  if (clientRequestId.length < 8) return { error: "unknown", at: Date.now() };

  const result = act(() => demoApi.addRound(orderId, { items, clientRequestId, ...(note ? { note } : {}) }));
  if (!result.ok) {
    const hit = result.error.errors.map((e) => e.field).find((field) => items.some((i) => i.menuItemId === field));
    return { error: result.error.code, menuItemId: hit, at: Date.now() };
  }
  return { ok: true, at: Date.now() };
}
