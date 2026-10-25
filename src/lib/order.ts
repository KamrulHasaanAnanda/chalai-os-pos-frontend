import type { Order } from "@/lib/api/types";

export type BillLine = { key: string; name: string; unitPriceTaka: number; quantity: number; totalTaka: number };

/**
 * What the guest pays for, merged by dish and price: items not cancelled, in rounds that reached the kitchen.
 * Matches the API's subtotal rule (spec §4 Totals).
 */
export function billLines(order: Order): BillLine[] {
  const lines = new Map<string, BillLine>();
  for (const round of order.rounds) {
    if (round.status === "pending_approval" || round.status === "rejected") continue;
    for (const item of round.items) {
      if (item.cancelledAt) continue;
      const key = `${item.menuItemId ?? item.name}:${item.unitPriceTaka}`;
      const line = lines.get(key) ?? { key, name: item.name, unitPriceTaka: item.unitPriceTaka, quantity: 0, totalTaka: 0 };
      line.quantity += item.quantity;
      line.totalTaka += item.quantity * item.unitPriceTaka;
      lines.set(key, line);
    }
  }
  return [...lines.values()];
}
