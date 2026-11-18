import type { Floor } from "@/lib/api/types";

/** What can need a waiter or cashier right now. The bell words each kind (messages: notifications.*). */
export type NotificationKind =
  "callWaiter" | "callWater" | "approve" | "bill" | "ready" | "booking";

export type Notification = {
  id: string;
  kind: NotificationKind;
  /** A table label, or a pickup token, for "Table 5" / "Pickup #3". */
  table?: string;
  token?: number;
  href: string;
  /** When it started, for calls ("3 min ago") and bookings (their time). */
  at?: string;
  /** Guest calls only: answered with Done. */
  callId?: string;
  name?: string;
  partySize?: number;
};

/** Bookings this close (or already due) show in the bell. */
const BOOKING_SOON_MS = 30 * 60_000;

/** Most urgent first: guests calling, orders to approve, bills, food to serve, then bookings. */
export function notificationsFrom(
  floor: Floor,
  now = Date.now(),
): Notification[] {
  const list: Notification[] = [];
  for (const call of floor.calls ?? []) {
    list.push({
      id: `call:${call.id}`,
      kind: call.type === "water" ? "callWater" : "callWaiter",
      table: call.tableLabel,
      href: call.orderId ? `/orders/${call.orderId}` : "/tables",
      at: call.createdAt,
      callId: call.id,
    });
  }
  const tables = floor.areas.flatMap((a) => a.tables);
  const pickups = floor.pickups ?? [];
  const each = (
    kind: "approve" | "bill" | "ready",
    has: (o: {
      pendingRounds: number;
      readyRounds: number;
      billRequested: boolean;
    }) => boolean,
    href: (id: string) => string,
  ) => {
    for (const t of tables)
      if (t.order && has(t.order))
        list.push({
          id: `${kind}:${t.order.id}`,
          kind,
          table: t.label,
          href: href(t.order.id),
        });
    for (const p of pickups)
      if (has(p))
        list.push({
          id: `${kind}:${p.id}`,
          kind,
          token: p.tokenNo,
          href: href(p.id),
        });
  };
  each(
    "approve",
    (o) => o.pendingRounds > 0,
    () => "/incoming",
  );
  each(
    "bill",
    (o) => o.billRequested,
    (id) => `/orders/${id}/bill`,
  );
  each(
    "ready",
    (o) => o.readyRounds > 0,
    (id) => `/orders/${id}`,
  );
  for (const r of floor.reservations ?? []) {
    if (new Date(r.at).getTime() - now > BOOKING_SOON_MS) continue;
    list.push({
      id: `booking:${r.id}`,
      kind: "booking",
      table: r.tableLabel ?? undefined,
      href: "/floor",
      at: r.at,
      name: r.name,
      partySize: r.partySize,
    });
  }
  return list;
}
