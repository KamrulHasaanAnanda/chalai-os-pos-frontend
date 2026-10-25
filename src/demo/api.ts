// Frontend-only demo: the POS endpoints the app calls (lib/api/client.ts apiFor), run against the localStorage store.
// Same names, inputs, results and error codes, so src/demo/actions/* read like src/actions/*.
import type { DiscountInput, MenuItem, Order, Override, PaymentInput, Role, RoundInput } from "@/lib/api/types";
import { billRoles, floorRoles, kitchenRoles, managerRoles, needsOverride } from "@/lib/roles";
import type { DemoOrder, DemoTable, DemoUser } from "./data";
import { go } from "./navigation";
import { getState, update, type DemoState } from "./store";

/** The API's error envelope (lib/api/client.ts ApiError). */
export class DemoApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly errors: { field: string; message: string }[] = [],
    readonly body: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = "DemoApiError";
  }
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const nowIso = () => new Date().toISOString();
const clone = <T>(value: T): T => structuredClone(value);

function signedIn(s: DemoState, roles?: Role[]): DemoUser {
  const user = s.users.find((u) => u.id === s.sessionUserId);
  if (!user) throw new DemoApiError(401, "unauthorized");
  if (roles && !roles.includes(user.role)) throw new DemoApiError(403, "forbidden");
  return user;
}

function openOrder(s: DemoState, orderId: string) {
  const order = s.orders.find((o) => o.id === orderId);
  if (!order) throw new DemoApiError(404, "not_found");
  if (order.status !== "open") throw new DemoApiError(409, "order_not_open");
  return order;
}

function findRound(s: DemoState, roundId: string) {
  for (const order of s.orders) {
    const round = order.rounds.find((r) => r.id === roundId);
    if (round) {
      if (order.status !== "open") throw new DemoApiError(409, "order_not_open");
      return { order, round };
    }
  }
  throw new DemoApiError(404, "not_found");
}

/** Cashiers and waiters need a manager's username + password; managers and owners approve themselves. */
function checkOverride(s: DemoState, user: DemoUser, override?: Override) {
  if (!needsOverride(user.role)) return;
  if (!override) throw new DemoApiError(403, "manager_approval_required");
  const manager = s.users.find((u) => u.username === override.username && u.password === override.password);
  if (!manager || !managerRoles.includes(manager.role)) throw new DemoApiError(403, "invalid_credentials");
}

const by = (user: DemoUser) => ({ id: user.id, name: user.name });

/** A new, empty open order at a table (or a takeaway), numbered after the last one. */
function newOrder(s: DemoState, table: DemoTable | null, guestName: string | null = null): DemoOrder {
  const order: DemoOrder = {
    id: newId("o"),
    number: s.nextNumber++,
    tableId: table?.id ?? null,
    tableLabel: table?.label ?? null,
    areaName: table ? (s.areas.find((a) => a.id === table.areaId)?.name ?? null) : null,
    status: "open",
    guestName,
    guestPhone: null,
    openedAt: nowIso(),
    closedAt: null,
    billRequestedAt: null,
    rounds: [],
    subtotalTaka: 0,
    discountTaka: 0,
    discountReason: null,
    vatPercent: s.restaurant.vatPercent,
    vatTaka: 0,
    totalTaka: 0,
    paidTaka: 0,
    dueTaka: 0,
    payments: [],
    discount: null,
  };
  s.orders.push(order);
  return order;
}

/** The current state of one order, as the API returns it after a change. */
const result = (s: DemoState, orderId: string): Order => clone(s.orders.find((o) => o.id === orderId)!);

export const demoApi = {
  login(username: string, password: string): DemoUser {
    const user = getState().users.find((u) => u.username === username && u.password === password);
    if (!user) throw new DemoApiError(401, "invalid_credentials");
    update((s) => {
      s.sessionUserId = user.id;
    });
    return user;
  },

  logout() {
    update((s) => {
      s.sessionUserId = null;
    });
  },

  openOrder: (tableId: string | null) =>
    update((s) => {
      signedIn(s, floorRoles);
      const table = tableId ? s.tables.find((t) => t.id === tableId) : null;
      if (tableId && !table) throw new DemoApiError(404, "not_found");
      const busy = table && s.orders.find((o) => o.tableId === table.id && o.status === "open");
      if (busy) throw new DemoApiError(409, "table_busy", [], { orderId: busy.id });
      return result(s, newOrder(s, table ?? null).id);
    }),

  /** Staff rounds skip approval and go straight to the kitchen queue. */
  addRound: (orderId: string, input: RoundInput) =>
    update((s) => {
      const user = signedIn(s, floorRoles);
      const order = openOrder(s, orderId);
      if (s.requestIds.includes(input.clientRequestId)) return result(s, orderId);
      const menu = new Map(s.menu.flatMap((c) => c.items).map((i) => [i.id, i]));
      const missing = input.items.filter((line) => !menu.get(line.menuItemId)?.isAvailable);
      if (missing.length) {
        throw new DemoApiError(409, "item_unavailable", missing.map((line) => ({ field: line.menuItemId, message: "Sold out" })));
      }
      const at = nowIso();
      order.rounds.push({
        id: newId("r"),
        source: "pos",
        status: "queued",
        note: input.note ?? null,
        createdAt: at,
        approvedAt: at,
        preparingAt: null,
        readyAt: null,
        servedAt: null,
        rejectedReason: null,
        createdBy: by(user),
        items: input.items.map((line) => {
          const item = menu.get(line.menuItemId)!;
          return {
            id: newId("i"),
            menuItemId: item.id,
            name: item.name,
            unitPriceTaka: item.priceTaka,
            quantity: line.quantity,
            note: line.note ?? null,
            lineTotalTaka: 0,
            cancelledAt: null,
            cancelReason: null,
          };
        }),
      });
      s.requestIds = [...s.requestIds.slice(-200), input.clientRequestId];
      return result(s, orderId);
    }),

  approveRound: (roundId: string) =>
    update((s) => {
      signedIn(s, floorRoles);
      const { order, round } = findRound(s, roundId);
      if (round.status !== "pending_approval") throw new DemoApiError(409, "not_found");
      round.status = "queued";
      round.approvedAt = nowIso();
      return result(s, order.id);
    }),

  rejectRound: (roundId: string, reason: string) =>
    update((s) => {
      signedIn(s, floorRoles);
      const { order, round } = findRound(s, roundId);
      if (round.status !== "pending_approval") throw new DemoApiError(409, "not_found");
      round.status = "rejected";
      round.rejectedReason = reason;
      return result(s, order.id);
    }),

  /** Ready rounds by anyone on the floor; managers may also mark queued or cooking rounds served. */
  serveRound: (roundId: string) =>
    update((s) => {
      const user = signedIn(s, floorRoles);
      const { order, round } = findRound(s, roundId);
      const early = round.status === "queued" || round.status === "preparing";
      if (round.status !== "ready" && !(early && managerRoles.includes(user.role))) throw new DemoApiError(403, "forbidden");
      round.status = "served";
      round.servedAt = nowIso();
      return result(s, order.id);
    }),

  cancelItem: (itemId: string, reason: string, override?: Override) =>
    update((s) => {
      const user = signedIn(s, floorRoles);
      const order = s.orders.find((o) => o.rounds.some((r) => r.items.some((i) => i.id === itemId)));
      if (!order) throw new DemoApiError(404, "not_found");
      openOrder(s, order.id);
      checkOverride(s, user, override);
      const item = order.rounds.flatMap((r) => r.items).find((i) => i.id === itemId)!;
      if (item.cancelledAt) throw new DemoApiError(409, "not_found");
      item.cancelledAt = nowIso();
      item.cancelReason = reason;
      return result(s, order.id);
    }),

  discount: (orderId: string, input: DiscountInput) =>
    update((s) => {
      const user = signedIn(s, billRoles);
      const order = openOrder(s, orderId);
      checkOverride(s, user, input.override);
      const value = "percent" in input ? input.percent : input.amountTaka;
      order.discount = value > 0 ? ("percent" in input ? { percent: input.percent } : { amountTaka: input.amountTaka }) : null;
      order.discountReason = value > 0 ? input.reason : null;
      return result(s, orderId);
    }),

  requestBill: (orderId: string) =>
    update((s) => {
      signedIn(s, floorRoles);
      openOrder(s, orderId).billRequestedAt = nowIso();
      return result(s, orderId);
    }),

  cancelOrder: (orderId: string, reason: string, override?: Override) =>
    update((s) => {
      const user = signedIn(s, floorRoles);
      const order = openOrder(s, orderId);
      if (order.payments.length) throw new DemoApiError(409, "has_payments");
      checkOverride(s, user, override);
      order.status = "cancelled";
      order.closedAt = nowIso();
      order.discountReason = reason;
      return result(s, orderId);
    }),

  /** Part payments are fine; the order closes (and the table frees) when nothing is due. */
  pay: (orderId: string, input: PaymentInput) =>
    update((s) => {
      const user = signedIn(s, billRoles);
      const order = openOrder(s, orderId);
      if (order.rounds.some((r) => r.status === "pending_approval")) throw new DemoApiError(409, "pending_rounds");
      if (input.amountTaka > order.dueTaka) throw new DemoApiError(422, "payment_too_much");
      order.payments.push({
        id: newId("p"),
        method: input.method,
        amountTaka: input.amountTaka,
        tenderedTaka: input.tenderedTaka ?? null,
        reference: input.reference ?? null,
        receivedBy: by(user),
        createdAt: nowIso(),
      });
      if (input.amountTaka === order.dueTaka) {
        order.status = "paid";
        order.closedAt = nowIso();
      }
      return result(s, orderId);
    }),

  setAvailability: (itemId: string, isAvailable: boolean): MenuItem =>
    update((s) => {
      signedIn(s, managerRoles);
      const item = s.menu.flatMap((c) => c.items).find((i) => i.id === itemId);
      if (!item) throw new DemoApiError(404, "not_found");
      item.isAvailable = isAvailable;
      return clone(item);
    }),

  setTicketStatus: (roundId: string, status: "preparing" | "ready") =>
    update((s) => {
      signedIn(s, kitchenRoles);
      const { round } = findRound(s, roundId);
      const from = status === "preparing" ? "queued" : "preparing";
      if (round.status !== from) throw new DemoApiError(409, "not_found");
      round.status = status;
      round[status === "preparing" ? "preparingAt" : "readyAt"] = nowIso();
    }),

  /** Demo only: what a guest scanning a table's QR code would send. Returns the table's label. */
  guestOrder: () =>
    update((s) => {
      const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
      const open = (tableId: string) => s.orders.find((o) => o.tableId === tableId && o.status === "open");
      const free = s.tables.filter((t) => !open(t.id));
      const quiet = s.tables.filter((t) => open(t.id)?.rounds.every((r) => r.status !== "pending_approval"));
      const table = pick(free.length ? free : quiet.length ? quiet : s.tables);
      const order = open(table.id) ?? newOrder(s, table, pick(["Ayesha", "Farhan", "Jannat", "Imran", "Sadia"]));
      const dishes = s.menu
        .flatMap((c) => c.items)
        .filter((i) => i.isAvailable)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2 + Math.floor(Math.random() * 2));
      order.rounds.push({
        id: newId("r"),
        source: "qr",
        status: "pending_approval",
        note: null,
        createdAt: nowIso(),
        approvedAt: null,
        preparingAt: null,
        readyAt: null,
        servedAt: null,
        rejectedReason: null,
        createdBy: null,
        items: dishes.map((dish) => ({
          id: newId("i"),
          menuItemId: dish.id,
          name: dish.name,
          unitPriceTaka: dish.priceTaka,
          quantity: 1 + Math.floor(Math.random() * 2),
          note: null,
          lineTotalTaka: 0,
          cancelledAt: null,
          cancelReason: null,
        })),
      });
      return table.label;
    }),
};

type Result<T> = { ok: true; data: T } | { ok: false; error: DemoApiError };

/** lib/session.ts act() for the demo: API errors come back for the form to show; anything else is a bug. */
export function act<T>(fn: () => T): Result<T> {
  try {
    return { ok: true, data: fn() };
  } catch (error) {
    if (!(error instanceof DemoApiError)) throw error;
    // Logged out in another tab: back to the login page, like a 401 in the real app.
    if (error.statusCode === 401) go("/login?error=session_expired");
    return { ok: false, error };
  }
}
