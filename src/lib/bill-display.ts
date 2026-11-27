import type { Order } from "@/lib/api/types";

/** UI-only title case; skips strings that contain Bengali letters. */
export function titleCaseLabel(name: string): string {
  if (/[\u0980-\u09FF]/.test(name)) return name;
  return name.replace(
    /\S+/g,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}

export type BillDetailLine = {
  key: string;
  quantity: number;
  title: string;
  variant: string | null;
  note: string | null;
  unitPriceTaka: number;
  totalTaka: number;
};

/** One row per line item (not merged), with optional variant split from the dish name. */
export function billDetailLines(order: Order): BillDetailLine[] {
  const rows: BillDetailLine[] = [];
  for (const round of order.rounds) {
    if (round.status === "pending_approval" || round.status === "rejected") continue;
    for (const item of round.items) {
      if (item.cancelledAt) continue;
      const name = titleCaseLabel(item.name.trim());
      const sep = name.match(/^(.+?)\s+[–-]\s+(.+)$/);
      rows.push({
        key: item.id,
        quantity: item.quantity,
        title: sep ? sep[1].trim() : name,
        variant: sep ? sep[2].trim() : null,
        note: item.note?.trim() || null,
        unitPriceTaka: item.unitPriceTaka,
        totalTaka: item.lineTotalTaka,
      });
    }
  }
  return rows;
}

/** Cash quick amounts: exact plus the next sensible note totals for Bangladesh. */
export function quickCashChips(due: number): number[] {
  if (!Number.isFinite(due) || due <= 0) return [];
  const extra = new Set<number>();
  for (const step of [100, 500, 1000, 2000]) {
    let up = Math.ceil(due / step) * step;
    if (up === due) up += step;
    extra.add(up);
  }
  return [due, ...[...extra].sort((a, b) => a - b).slice(0, 3)];
}