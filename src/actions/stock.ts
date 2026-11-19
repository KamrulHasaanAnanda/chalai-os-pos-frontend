"use server";
// Stock: send goods from this branch to another (owner, or a manager with the stock grant).
import { act, requireStaff } from "@/lib/session";

export async function sendStockAction(goodId: string, toBranchId: string, quantity: number): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireStaff({ roles: ["owner", "manager"] });
  if (!Number.isFinite(quantity) || quantity <= 0) return { ok: false, error: "bad_quantity" };
  const result = await act((api) => api.sendStock(String(goodId), String(toBranchId), quantity));
  return result.ok ? { ok: true } : { ok: false, error: result.error.code };
}
