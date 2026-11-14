import type { Floor, KitchenTicket, MenuCategory, OrderSummary } from "@/lib/api/types";
import { formatTaka } from "@/lib/format";
import { orderHref } from "@/lib/paths";
import type { BotQuestion, BotReply } from "@/types/chalai-bot";

export type AssistantIntent =
  | "floor"
  | "approval"
  | "ready"
  | "bills"
  | "kitchen"
  | "sales"
  | "stock"
  | "help"
  | "greet";

export const ASSISTANT_CHIPS = [
  "floor",
  "approval",
  "ready",
  "bills",
  "kitchen",
  "sales",
] as const satisfies readonly AssistantIntent[];

type TableHit = { label: string; orderId: string; totalTaka: number };

/** What the bot can say about the restaurant at the moment the question is asked. */
export type AssistantSnapshot = {
  restaurant: string;
  floor: null | {
    tables: number;
    busy: number;
    free: number;
    seats: number;
    seatsTaken: number;
    openBillsTaka: number;
    approval: TableHit[];
    ready: TableHit[];
    bills: TableHit[];
  };
  kitchen: null | { queued: number; preparing: number; ready: number };
  orders: null | {
    paidOrders: number;
    paidTaka: number;
    openOrders: number;
    dueTaka: number;
  };
  menu: null | { low: { name: string; left: number }[]; soldOut: string[] };
};

export function buildSnapshot(input: {
  restaurant: string;
  floor: Floor | null;
  orders: OrderSummary[] | null;
  tickets: KitchenTicket[] | null;
  menu: MenuCategory[] | null;
}): AssistantSnapshot {
  return {
    restaurant: input.restaurant,
    floor: input.floor ? readFloor(input.floor) : null,
    kitchen: input.tickets ? readKitchen(input.tickets) : null,
    orders: input.orders ? readOrders(input.orders) : null,
    menu: input.menu ? readMenu(input.menu) : null,
  };
}

function readFloor(floor: Floor): NonNullable<AssistantSnapshot["floor"]> {
  const out: NonNullable<AssistantSnapshot["floor"]> = {
    tables: 0,
    busy: 0,
    free: 0,
    seats: 0,
    seatsTaken: 0,
    openBillsTaka: 0,
    approval: [],
    ready: [],
    bills: [],
  };
  for (const table of floor.areas.flatMap((area) => area.tables)) {
    out.tables += 1;
    out.seats += table.seats;
    if (table.status === "free" || !table.order) {
      out.free += 1;
      continue;
    }
    out.busy += 1;
    out.seatsTaken += table.seats;
    out.openBillsTaka += table.order.totalTaka;
    const hit = {
      label: table.label,
      orderId: table.order.id,
      totalTaka: table.order.totalTaka,
    };
    if (table.status === "needs_approval") out.approval.push(hit);
    if (table.status === "food_ready") out.ready.push(hit);
    if (table.status === "bill_requested") out.bills.push(hit);
  }
  return out;
}

function readKitchen(tickets: KitchenTicket[]) {
  return {
    queued: tickets.filter((ticket) => ticket.status === "queued").length,
    preparing: tickets.filter((ticket) => ticket.status === "preparing").length,
    ready: tickets.filter((ticket) => ticket.status === "ready").length,
  };
}

function readOrders(orders: OrderSummary[]) {
  const paid = orders.filter((order) => order.status === "paid");
  const open = orders.filter((order) => order.status === "open");
  return {
    paidOrders: paid.length,
    paidTaka: paid.reduce((sum, order) => sum + order.totalTaka, 0),
    openOrders: open.length,
    dueTaka: open.reduce((sum, order) => sum + order.dueTaka, 0),
  };
}

function readMenu(menu: MenuCategory[]) {
  const low: { name: string; left: number }[] = [];
  const soldOut: string[] = [];
  for (const item of menu.flatMap((category) => category.items)) {
    if (!item.isAvailable || item.stockLeft === 0) soldOut.push(item.name);
    else if (item.stockLeft != null && item.stockLeft <= 3) low.push({ name: item.name, left: item.stockLeft });
  }
  low.sort((a, b) => a.left - b.left);
  return { low, soldOut };
}

type Copy = (key: string, values?: Record<string, string | number>) => string;

const INTENTS = new Set<AssistantIntent>([
  "floor",
  "approval",
  "ready",
  "bills",
  "kitchen",
  "sales",
  "stock",
  "help",
  "greet",
]);

const RULES: [AssistantIntent, RegExp][] = [
  ["stock", /sold out|running low|portion|stock|how many left/],
  ["approval", /approv|incoming|qr|pending/],
  ["ready", /food ready|ready to serve|\bserve\b/],
  ["bills", /\bbills?\b|want to pay|collect/],
  ["kitchen", /kitchen|cook|ticket/],
  ["sales", /sale|revenue|today|earned|how much|taka|paid/],
  ["floor", /table|floor|free|busy|seat|occupied/],
  ["help", /help|what can|how do/],
  ["greet", /\b(hi|hello|hey)\b/],
];

function intentOf(question: BotQuestion): AssistantIntent | null {
  if (question.intent && INTENTS.has(question.intent as AssistantIntent)) {
    return question.intent as AssistantIntent;
  }
  const text = question.text.toLowerCase();
  return RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

const tableName = (label: string) => `Table ${label}`;

function oneOrMany(
  hits: TableHit[],
  t: Copy,
  one: string,
  many: string,
  none: string,
  href: (hit: TableHit) => string,
  manyHref: string,
  manyLabel: string,
): BotReply {
  if (hits.length === 0) return { lines: [t(none)] };
  if (hits.length === 1) {
    const hit = hits[0];
    return {
      lines: [t(one, { table: hit.label, total: formatTaka(hit.totalTaka) })],
      link: { href: href(hit), label: t("links.order") },
    };
  }
  return {
    lines: [t(many, { n: hits.length })],
    list: hits.slice(0, 6).map((hit) => `${tableName(hit.label)} · ${formatTaka(hit.totalTaka)}`),
    link: { href: manyHref, label: manyLabel },
  };
}

/** Turns one question into the bot's reply from a fresh snapshot. */
export function answerQuestion(
  question: BotQuestion,
  snap: AssistantSnapshot | null,
  restaurant: string,
  t: Copy,
): BotReply {
  const intent = intentOf(question);
  if (intent === "greet") return { lines: [t("greet", { name: restaurant })] };
  if (intent === "help" || intent === null) return { lines: [t(intent === "help" ? "help" : "fallback")] };
  if (!snap) return { lines: [t("unavailable")] };

  switch (intent) {
    case "floor": {
      if (!snap.floor) return { lines: [t("unavailable")], link: { href: "/floor", label: t("links.floor") } };
      const floor = snap.floor;
      if (floor.busy === 0) {
        return {
          lines: [t("floorEmpty", { tables: floor.tables, seats: floor.seats })],
          link: { href: "/floor", label: t("links.floor") },
        };
      }
      return {
        lines: [
          t("floor", { busy: floor.busy, tables: floor.tables, free: floor.free }),
          t("floorSeats", {
            taken: floor.seatsTaken,
            seats: floor.seats,
            bills: formatTaka(floor.openBillsTaka),
          }),
          t("floorQueues", {
            approval: floor.approval.length,
            ready: floor.ready.length,
            bills: floor.bills.length,
          }),
        ],
        link: { href: "/floor", label: t("links.floor") },
      };
    }
    case "approval":
      if (!snap.floor) return { lines: [t("unavailable")] };
      return oneOrMany(
        snap.floor.approval,
        t,
        "approvalOne",
        "approvalMany",
        "approvalNone",
        (hit) => orderHref(hit.orderId),
        "/incoming",
        t("links.incoming"),
      );
    case "ready":
      if (!snap.floor) return { lines: [t("unavailable")] };
      return oneOrMany(
        snap.floor.ready,
        t,
        "readyOne",
        "readyMany",
        "readyNone",
        (hit) => orderHref(hit.orderId),
        "/floor",
        t("links.floor"),
      );
    case "bills":
      if (!snap.floor) return { lines: [t("unavailable")] };
      return oneOrMany(
        snap.floor.bills,
        t,
        "billsOne",
        "billsMany",
        "billsNone",
        (hit) => orderHref(hit.orderId, "bill"),
        "/orders",
        t("links.orders"),
      );
    case "kitchen": {
      if (!snap.kitchen) return { lines: [t("kitchenDenied")], link: { href: "/kitchen", label: t("links.kitchen") } };
      const { queued, preparing, ready } = snap.kitchen;
      if (queued + preparing + ready === 0) {
        return { lines: [t("kitchenNone")], link: { href: "/kitchen", label: t("links.kitchen") } };
      }
      return {
        lines: [t("kitchen", { queued, preparing, ready })],
        link: { href: "/kitchen", label: t("links.kitchen") },
      };
    }
    case "sales": {
      if (!snap.orders) return { lines: [t("unavailable")], link: { href: "/orders", label: t("links.orders") } };
      const orders = snap.orders;
      return {
        lines: [
          orders.paidOrders === 0
            ? t("salesNone")
            : t("sales", { total: formatTaka(orders.paidTaka), orders: orders.paidOrders }),
          t("salesOpen", { open: orders.openOrders, due: formatTaka(orders.dueTaka) }),
        ],
        link: { href: "/orders", label: t("links.orders") },
      };
    }
    case "stock": {
      if (!snap.menu) return { lines: [t("menuDenied")], link: { href: "/menu", label: t("links.menu") } };
      const { low, soldOut } = snap.menu;
      const lines = [
        low.length === 0 ? t("stockNone") : t("stock", { n: low.length }),
        soldOut.length === 0 ? t("soldOutNone") : t("soldOut", { n: soldOut.length }),
      ];
      const list = [
        ...low.slice(0, 4).map((item) => t("stockLine", { name: item.name, n: item.left })),
        ...soldOut.slice(0, 4).map((name) => t("soldOutLine", { name })),
      ];
      return {
        lines,
        ...(list.length ? { list } : {}),
        link: { href: "/menu", label: t("links.menu") },
      };
    }
    default:
      return { lines: [t("fallback")] };
  }
}
