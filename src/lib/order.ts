import type { Order, Receipt, Restaurant } from "@/lib/api/types";

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

/**
 * The demo build has no API: it builds the receipt from its own order. Service charge and rounding aren't in the
 * POS order, so they show as zero there; the live app always uses GET /pos/print/orders/:id.
 */
export function receiptFromOrder(order: Order, restaurant: Restaurant): Receipt {
  return {
    orderId: order.id,
    billNumber: order.number,
    status: order.status,
    restaurantName: restaurant.name,
    branchName: "",
    branchAddress: restaurant.area,
    tableLabel: order.tableLabel,
    areaName: null,
    guestName: order.guestName,
    openedAt: order.openedAt,
    closedAt: order.closedAt,
    receiptWidthMm: restaurant.receiptWidthMm ?? 80,
    items: billLines(order).map((line) => ({
      name: line.name,
      quantity: line.quantity,
      unitPriceTaka: line.unitPriceTaka,
      lineTotalTaka: line.totalTaka,
    })),
    subtotalTaka: order.subtotalTaka,
    discountTaka: order.discountTaka,
    serviceChargePercent: 0,
    serviceChargeTaka: 0,
    vatPercent: order.vatPercent,
    vatMode: "exclusive",
    vatTaka: order.vatTaka,
    roundingTaka: 0,
    totalTaka: order.totalTaka,
    paidTaka: order.paidTaka,
    dueTaka: order.dueTaka,
    payments: order.payments.map((p) => ({
      method: p.method,
      amountTaka: p.amountTaka,
      tenderedTaka: p.tenderedTaka,
      changeTaka: p.tenderedTaka ? p.tenderedTaka - p.amountTaka : 0,
      reference: p.reference,
    })),
  };
}
