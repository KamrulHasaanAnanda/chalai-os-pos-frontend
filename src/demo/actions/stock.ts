// Frontend-only demo: stubs for src/actions/stock.ts (no stock screen in the static demo).
export async function sendStockAction(
  _goodId: string,
  _toBranchId: string,
  _quantity: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return { ok: false, error: "demo" };
}