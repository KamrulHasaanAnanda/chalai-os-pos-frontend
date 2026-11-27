// Frontend-only demo: stubs for src/actions/manage.ts (prepare.mjs copies this over the server module).
import type { CustomerCredit, ManageBranchPatch, ManageCouponInput, PromotionInput } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";

const nope = () => ({ ok: false as const, error: new ApiError(400, "demo", "Not available in the demo") });

export async function createCouponAction(_input: ManageCouponInput) {
  return nope();
}

export async function updateCouponAction(
  _id: string,
  _input: Partial<ManageCouponInput> & { active?: boolean },
) {
  return nope();
}

export async function removeCouponAction(_id: string) {
  return nope();
}

export async function updateBranchAction(_input: ManageBranchPatch) {
  return nope();
}

export async function saveQrHighlightsAction(_input: {
  popularItemIds: string[];
  offerTitle: string | null;
  offerBody: string | null;
}) {
  return nope();
}

export async function savePromotionAction(_id: string | null, _input: PromotionInput) {
  return nope();
}

export async function setPromotionActiveAction(_id: string, _active: boolean) {
  return nope();
}

export async function removePromotionAction(_id: string) {
  return nope();
}

export async function findCreditCustomerAction(
  _phone: string,
): Promise<{ ok: true; data: CustomerCredit | null } | { ok: false; error: ApiError }> {
  return { ok: false, error: new ApiError(404, "not_found", "Not in demo") };
}

export async function collectCreditAction(
  _customerId: string,
  _input: { method: "cash" | "bkash" | "nagad" | "card"; amountTaka: number; note?: string },
  _idempotencyKey: string,
): Promise<{ ok: true; data: CustomerCredit } | { ok: false; error: ApiError }> {
  return { ok: false, error: new ApiError(400, "demo", "Not in demo") };
}