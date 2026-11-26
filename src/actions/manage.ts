"use server";

import { revalidatePath } from "next/cache";
import { act } from "@/lib/session";
import type { ManageBranchPatch, ManageCouponInput } from "@/lib/api/types";

export async function createCouponAction(input: ManageCouponInput) {
  const result = await act((api) => api.createManageCoupon(input));
  if (result.ok) revalidatePath("/manage/coupons");
  return result;
}

export async function updateCouponAction(
  id: string,
  input: Partial<ManageCouponInput> & { active?: boolean },
) {
  const result = await act((api) => api.updateManageCoupon(id, input));
  if (result.ok) revalidatePath("/manage/coupons");
  return result;
}

export async function removeCouponAction(id: string) {
  const result = await act((api) => api.removeManageCoupon(id));
  if (result.ok) revalidatePath("/manage/coupons");
  return result;
}

export async function updateBranchAction(input: ManageBranchPatch) {
  const result = await act((api) => api.updateManageBranch(input));
  if (result.ok) revalidatePath("/manage/branch");
  return result;
}

export async function saveQrHighlightsAction(input: {
  popularItemIds: string[];
  offerTitle: string | null;
  offerBody: string | null;
}) {
  const result = await act((api) => api.saveManageQrHighlights(input));
  if (result.ok) revalidatePath("/manage/qr-highlights");
  return result;
}

// ——— Customer credit (বাকি) ———

export async function findCreditCustomerAction(phone: string) {
  const found = await act((api) => api.findCustomer(phone));
  if (!found.ok || !found.data.customer) return found.ok ? ({ ok: true, data: null } as const) : found;
  const id = found.data.customer.id;
  return act((api) => api.customerCredit(id));
}

export async function collectCreditAction(
  customerId: string,
  input: { method: "cash" | "bkash" | "nagad" | "card"; amountTaka: number; note?: string },
  idempotencyKey: string,
) {
  return act((api) => api.collectCredit(customerId, input, idempotencyKey));
}
