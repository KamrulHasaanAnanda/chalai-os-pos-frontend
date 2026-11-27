"use server";

import { revalidatePath } from "next/cache";
import { act } from "@/lib/session";
import type { ManageBranchPatch, ManageCouponInput, PromotionInput } from "@/lib/api/types";

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

// ——— Promotions (deals, packages, offers, dishes on trial) ———

export async function savePromotionAction(id: string | null, input: PromotionInput) {
  const result = await act((api) => (id ? api.updatePromotion(id, input) : api.createPromotion(input)));
  if (result.ok) revalidatePath("/manage/promotions");
  return result;
}

export async function setPromotionActiveAction(id: string, active: boolean) {
  const result = await act((api) => api.setPromotionActive(id, active));
  if (result.ok) revalidatePath("/manage/promotions");
  return result;
}

export async function removePromotionAction(id: string) {
  const result = await act((api) => api.removePromotion(id));
  if (result.ok) revalidatePath("/manage/promotions");
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
