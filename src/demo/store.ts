// Frontend-only demo: the whole restaurant (tables, menu, orders, who is logged in) lives in this browser's
// localStorage. Other tabs see changes through the storage event, so the kitchen screen in one tab and the floor in
// another stay in step, like the real app does over Socket.IO.
import type { Floor, FloorTable, KitchenTicket, Me, OrderStatus, OrderSummary, TableStatus } from "@/lib/api/types";
import { businessDate } from "@/lib/format";
import { billLines } from "@/lib/order";
import { demoAreas, demoMenu, demoRestaurant, demoTables, demoUsers, seedOrders, type DemoOrder, type DemoTable, type DemoUser } from "./data";

const KEY = "chalai.pos.demo";
const VERSION = 1;
/** A visitor coming back the next day gets a fresh restaurant: day-old orders and timers would make no sense. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export type DemoState = {
  version: number;
  seededAt: number;
  sessionUserId: string | null;
  restaurant: typeof demoRestaurant;
  users: DemoUser[];
  areas: { id: string; name: string }[];
  tables: DemoTable[];
  menu: typeof demoMenu;
  orders: DemoOrder[];
  nextNumber: number;
  /** clientRequestIds already used, so a double-tapped Send adds one round (like the API's idempotency key). */
  requestIds: string[];
};

/** Subtotal → discount → VAT → total → paid → due, the API's rules (spec §4 Totals). */
export function recompute(order: DemoOrder) {
  for (const round of order.rounds) for (const item of round.items) item.lineTotalTaka = item.quantity * item.unitPriceTaka;
  const subtotal = billLines(order).reduce((sum, line) => sum + line.totalTaka, 0);
  const discount = order.discount;
  const discountTaka = !discount ? 0 : "percent" in discount ? Math.round((subtotal * discount.percent) / 100) : Math.min(discount.amountTaka, subtotal);
  const vatTaka = Math.round(((subtotal - discountTaka) * order.vatPercent) / 100);
  const totalTaka = subtotal - discountTaka + vatTaka;
  const paidTaka = order.payments.reduce((sum, p) => sum + p.amountTaka, 0);
  Object.assign(order, { subtotalTaka: subtotal, discountTaka, vatTaka, totalTaka, paidTaka, dueTaka: Math.max(0, totalTaka - paidTaka) });
}

function seed(): DemoState {
  const orders = seedOrders(Date.now());
  for (const order of orders) {
    recompute(order);
    // Seed payments of 0 stand for "the whole bill" (see data.ts).
    for (const payment of order.payments) if (payment.amountTaka === 0) payment.amountTaka = order.totalTaka;
    recompute(order);
  }
  return {
    version: VERSION,
    seededAt: Date.now(),
    sessionUserId: null,
    restaurant: demoRestaurant,
    users: demoUsers,
    areas: demoAreas,
    tables: demoTables,
    menu: demoMenu,
    orders,
    nextNumber: Math.max(...orders.map((o) => o.number)) + 1,
    requestIds: [],
  };
}

function read(): DemoState {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as DemoState) : null;
    if (parsed && parsed.version === VERSION && Date.now() - parsed.seededAt < MAX_AGE_MS) return parsed;
  } catch {
    // Private mode or a broken value: start over.
  }
  const fresh = seed();
  write(fresh);
  return fresh;
}

function write(next: DemoState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the demo still works until the page is reloaded.
  }
}

let state: DemoState | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function onStorage(event: StorageEvent) {
  if (event.key !== KEY && event.key !== null) return;
  state = read();
  notify();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/** The current state. Stable between changes, as useSyncExternalStore needs. */
export function getState(): DemoState {
  state ??= read();
  return state;
}

/** Applies one change to a copy, recomputes every order's totals, saves and re-renders. */
export function update<T>(change: (draft: DemoState) => T): T {
  const draft = structuredClone(getState());
  const result = change(draft);
  draft.orders.forEach(recompute);
  state = draft;
  write(draft);
  notify();
  return result;
}

export function reset() {
  const signedIn = getState().sessionUserId;
  state = { ...seed(), sessionUserId: signedIn };
  write(state);
  notify();
}

// Read models: the same shapes the API's GET endpoints return.

export function me(s: DemoState): Me | null {
  const user = s.users.find((u) => u.id === s.sessionUserId);
  if (!user) return null;
  const visible: Partial<DemoUser> = { ...user };
  delete visible.password;
  return { user: visible as Me["user"], restaurant: s.restaurant, actingAs: false };
}

function tableStatus(order: DemoOrder | undefined): TableStatus {
  if (!order) return "free";
  if (order.rounds.some((r) => r.status === "pending_approval")) return "needs_approval";
  if (order.rounds.some((r) => r.status === "ready")) return "food_ready";
  if (order.billRequestedAt) return "bill_requested";
  return "occupied";
}

export function floor(s: DemoState): Floor {
  return {
    areas: s.areas.map((area) => ({
      id: area.id,
      name: area.name,
      tables: s.tables
        .filter((t) => t.areaId === area.id)
        .map((t): FloorTable => {
          const order = s.orders.find((o) => o.tableId === t.id && o.status === "open");
          return {
            id: t.id,
            label: t.label,
            seats: t.seats,
            gridX: t.gridX,
            gridY: t.gridY,
            status: tableStatus(order),
            order: order
              ? {
                  id: order.id,
                  number: order.number,
                  openedAt: order.openedAt,
                  totalTaka: order.totalTaka,
                  pendingRounds: order.rounds.filter((r) => r.status === "pending_approval").length,
                  readyRounds: order.rounds.filter((r) => r.status === "ready").length,
                  billRequested: !!order.billRequestedAt,
                }
              : null,
          };
        }),
    })),
  };
}

export function orderSummaries(s: DemoState, { status, date }: { status?: OrderStatus; date: string }): OrderSummary[] {
  return s.orders
    .filter((o) => businessDate(s.restaurant.timezone, new Date(o.openedAt)) === date && (!status || o.status === status))
    .sort((a, b) => b.number - a.number)
    .map((o) => ({
      id: o.id,
      number: o.number,
      tableLabel: o.tableLabel,
      status: o.status,
      totalTaka: o.totalTaka,
      dueTaka: o.dueTaka,
      openedAt: o.openedAt,
      closedAt: o.closedAt,
    }));
}

export function tickets(s: DemoState): KitchenTicket[] {
  return s.orders
    .filter((o) => o.status === "open")
    .flatMap((o) =>
      o.rounds
        .filter((r): r is typeof r & { status: KitchenTicket["status"] } => r.status === "queued" || r.status === "preparing" || r.status === "ready")
        .map((r) => ({
          roundId: r.id,
          orderId: o.id,
          orderNumber: o.number,
          tableLabel: o.tableLabel,
          areaName: o.areaName,
          status: r.status,
          note: r.note,
          createdAt: r.createdAt,
          approvedAt: r.approvedAt,
          preparingAt: r.preparingAt,
          readyAt: r.readyAt,
          items: r.items.filter((i) => !i.cancelledAt).map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, note: i.note })),
        })),
    )
    .sort((a, b) => (a.approvedAt ?? a.createdAt).localeCompare(b.approvedAt ?? b.createdAt));
}
