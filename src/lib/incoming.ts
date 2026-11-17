import type { Floor, Order, Round } from "@/lib/api/types";

/** A QR round waiting for a waiter, with the order it belongs to. */
export type IncomingRound = { order: Order; round: Round };

export type Incoming = { rounds: IncomingRound[]; bills: Order[] };

/** Orders worth loading for the Incoming screen: tables with a QR order to approve or a bill request. */
export function incomingOrderIds(floor: Floor): string[] {
  return floor.areas
    .flatMap((a) => a.tables)
    .flatMap((t) => (t.order && (t.order.pendingRounds > 0 || t.order.billRequested) ? [t.order.id] : []))
    // Online pickups have no table (online-ordering spec).
    .concat((floor.pickups ?? []).flatMap((p) => (p.pendingRounds > 0 || p.billRequested ? [p.id] : [])));
}

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

/** Oldest first: whoever has waited longest is served first. */
export function incomingFrom(orders: Order[]): Incoming {
  const open = orders.filter((o) => o.status === "open");
  const rounds = open
    .flatMap((order) => order.rounds.filter((r) => r.status === "pending_approval").map((round) => ({ order, round })))
    .sort((a, b) => time(a.round.createdAt) - time(b.round.createdAt));
  const bills = open.filter((o) => o.billRequestedAt).sort((a, b) => time(a.billRequestedAt) - time(b.billRequestedAt));
  return { rounds, bills };
}
