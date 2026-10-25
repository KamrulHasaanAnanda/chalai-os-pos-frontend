// Frontend-only demo (CHALAI_DEMO=1): the sample restaurant every visitor starts with. Plain data; src/demo/store.ts
// copies it into localStorage and changes it from there.
import type { MenuCategory, MenuItem, Order, Payment, Restaurant, Round, User } from "@/lib/api/types";

export type DemoUser = User & { password: string };
export type DemoTable = { id: string; areaId: string; label: string; seats: number; gridX: number | null; gridY: number | null };
export type DemoDiscount = { amountTaka: number } | { percent: number };
/** An order as the API returns it, plus how its discount was entered (the API keeps that too). */
export type DemoOrder = Order & { discount: DemoDiscount | null };

export const DEMO_PASSWORD = "demo1234";

export const demoRestaurant: Restaurant = {
  id: "r-demo",
  name: "Rahim's Kacchi House",
  area: "Dhanmondi, Dhaka",
  logoUrl: null,
  plan: "complete",
  modules: ["pos", "kitchen", "qr"],
  status: "active",
  onboardingStep: "done",
  vatPercent: 5,
  timezone: "Asia/Dhaka",
  subscription: null,
  createdAt: "2026-01-10T06:00:00.000Z",
};

const user = (id: string, role: User["role"], name: string, phone: string): DemoUser => ({
  id,
  role,
  name,
  phone,
  username: role,
  password: DEMO_PASSWORD,
  mustChangePassword: false,
  isActive: true,
  restaurantId: demoRestaurant.id,
  lastLoginAt: null,
});

/** One account per role; the username is the role. */
export const demoUsers: DemoUser[] = [
  user("u-manager", "manager", "Nusrat Jahan", "01711000001"),
  user("u-cashier", "cashier", "Rafiq Islam", "01711000002"),
  user("u-waiter", "waiter", "Sumon Ahmed", "01711000003"),
  user("u-kitchen", "kitchen", "Kamal Hossain", "01711000004"),
];

export const demoAreas = [
  { id: "a-ground", name: "Ground floor" },
  { id: "a-roof", name: "Rooftop" },
];

const table = (areaId: string, label: string, seats: number, gridX: number | null, gridY: number | null): DemoTable => ({
  id: `t-${label.toLowerCase()}`,
  areaId,
  label,
  seats,
  gridX,
  gridY,
});

export const demoTables: DemoTable[] = [
  ...["1", "2", "3", "4", "5"].map((label, i) => table("a-ground", label, i % 2 ? 4 : 2, i, 0)),
  ...["6", "7", "8", "9", "10"].map((label, i) => table("a-ground", label, i === 4 ? 8 : 4, i, 2)),
  table("a-roof", "R1", 4, 0, 0),
  table("a-roof", "R2", 4, 2, 0),
  table("a-roof", "R3", 6, 4, 0),
  table("a-roof", "R4", 2, null, null),
];

const dish = (id: string, categoryId: string, name: string, priceTaka: number, description = "", isAvailable = true): MenuItem => ({
  id,
  categoryId,
  name,
  description,
  priceTaka,
  photoUrl: null,
  isAvailable,
  sortOrder: 0,
});

/** The same menu as the QR demo (customer.chalai.app), so the two demos tell one story. */
export const demoMenu: MenuCategory[] = [
  {
    id: "kacchi",
    name: "Kacchi & Biryani",
    sortOrder: 1,
    items: [
      dish("kacchi-full", "kacchi", "Mutton Kacchi (full)", 420, "Basmati rice slow-cooked with tender mutton, potato and a boiled egg."),
      dish("kacchi-half", "kacchi", "Mutton Kacchi (half)", 260, "Half plate of our signature kacchi."),
      dish("chicken-biryani", "kacchi", "Chicken Biryani", 280, "Fragrant rice with spiced chicken and fried onions."),
      dish("morog-polao", "kacchi", "Morog Polao", 320, "Wedding-style polao with a whole chicken leg.", false),
    ],
  },
  {
    id: "curries",
    name: "Curries",
    sortOrder: 2,
    items: [
      dish("beef-rezala", "curries", "Beef Rezala", 300, "Rich yogurt and cashew gravy, mildly spiced."),
      dish("chicken-roast", "curries", "Chicken Roast", 220, "Sweet and savoury, cooked in ghee."),
      dish("dal", "curries", "Mixed Dal", 90),
    ],
  },
  {
    id: "grill",
    name: "Kebabs & Grill",
    sortOrder: 3,
    items: [
      dish("chicken-tikka", "grill", "Chicken Tikka (4 pcs)", 240, "Charcoal grilled, served with mint chutney."),
      dish("shami-kebab", "grill", "Shami Kebab (2 pcs)", 120, "Minced beef and lentil patties."),
      dish("naan", "grill", "Butter Naan", 40),
    ],
  },
  {
    id: "drinks",
    name: "Drinks",
    sortOrder: 4,
    items: [
      dish("borhani", "drinks", "Borhani", 70, "Spiced yogurt drink, the classic kacchi partner."),
      dish("lassi", "drinks", "Sweet Lassi", 90),
      dish("water", "drinks", "Mineral Water (500 ml)", 25),
      dish("cola", "drinks", "Soft Drink (250 ml)", 40),
    ],
  },
  {
    id: "desserts",
    name: "Desserts",
    sortOrder: 5,
    items: [dish("firni", "desserts", "Firni", 80, "Chilled rice pudding in a clay bowl."), dish("doi", "desserts", "Mishti Doi", 70, "Sweet baked yogurt from Bogura.")],
  },
];

const dishes = new Map(demoMenu.flatMap((c) => c.items).map((i) => [i.id, i]));
const waiter = { id: "u-waiter", name: "Sumon Ahmed" };
const cashier = { id: "u-cashier", name: "Rafiq Islam" };

/** The orders a visitor finds when they arrive: one table in each floor state, and two paid bills. */
export function seedOrders(now: number): DemoOrder[] {
  const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
  let itemSeq = 0;
  const items = (lines: [string, number, string?][]) =>
    lines.map(([id, quantity, note]) => {
      const menuItem = dishes.get(id)!;
      return {
        id: `seed-i${++itemSeq}`,
        menuItemId: id,
        name: menuItem.name,
        unitPriceTaka: menuItem.priceTaka,
        quantity,
        note: note ?? null,
        lineTotalTaka: quantity * menuItem.priceTaka,
        cancelledAt: null,
        cancelReason: null,
      };
    });
  const round = (id: string, status: Round["status"], minutes: number, lines: [string, number, string?][], source: Round["source"] = "pos"): Round => ({
    id,
    source,
    status,
    note: null,
    createdAt: ago(minutes),
    approvedAt: status === "pending_approval" ? null : ago(minutes),
    preparingAt: ["preparing", "ready", "served"].includes(status) ? ago(minutes - 2) : null,
    readyAt: ["ready", "served"].includes(status) ? ago(Math.max(1, minutes - 12)) : null,
    servedAt: status === "served" ? ago(Math.max(1, minutes - 15)) : null,
    rejectedReason: null,
    createdBy: source === "qr" ? null : waiter,
    items: items(lines),
  });
  const tableOf = (label: string) => {
    const t = demoTables.find((x) => x.label === label)!;
    return { tableId: t.id, tableLabel: t.label, areaName: demoAreas.find((a) => a.id === t.areaId)!.name };
  };
  const order = (
    id: string,
    number: number,
    where: { tableId: string | null; tableLabel: string | null; areaName: string | null },
    openedMinutes: number,
    rounds: Round[],
    extra: Partial<DemoOrder> = {},
  ): DemoOrder => ({
    id,
    number,
    ...where,
    status: "open",
    guestName: null,
    guestPhone: null,
    openedAt: ago(openedMinutes),
    closedAt: null,
    billRequestedAt: null,
    rounds,
    subtotalTaka: 0,
    discountTaka: 0,
    discountReason: null,
    vatPercent: demoRestaurant.vatPercent,
    vatTaka: 0,
    totalTaka: 0,
    paidTaka: 0,
    dueTaka: 0,
    payments: [],
    discount: null,
    ...extra,
  });
  const payment = (id: string, method: Payment["method"], amountTaka: number, minutes: number, extra: Partial<Payment> = {}): Payment => ({
    id,
    method,
    amountTaka,
    tenderedTaka: null,
    reference: null,
    receivedBy: cashier,
    createdAt: ago(minutes),
    ...extra,
  });
  const takeaway = { tableId: null, tableLabel: null, areaName: null };

  // Payments are filled in by the store's totals pass (store.ts recompute): `amountTaka: 0` here means "the whole bill".
  return [
    order("o-101", 101, takeaway, 150, [round("seed-r1", "served", 148, [["chicken-biryani", 2], ["borhani", 2]])], {
      status: "paid",
      closedAt: ago(130),
      guestName: "Mitu",
      payments: [payment("seed-p1", "bkash", 0, 130, { reference: "9CX41K2M7Q" })],
    }),
    order("o-102", 102, tableOf("3"), 120, [round("seed-r2", "served", 118, [["kacchi-full", 2], ["shami-kebab", 1], ["doi", 2]])], {
      status: "paid",
      closedAt: ago(75),
      payments: [payment("seed-p2", "cash", 0, 75, { tenderedTaka: 1500 })],
    }),
    order("o-103", 103, tableOf("9"), 70, [round("seed-r3", "served", 68, [["kacchi-half", 3], ["chicken-roast", 1], ["cola", 3]])], {
      billRequestedAt: ago(3),
    }),
    order("o-104", 104, tableOf("2"), 48, [
      round("seed-r4", "served", 46, [["kacchi-full", 2], ["borhani", 2, "Less sugar"]]),
      round("seed-r5", "queued", 6, [["firni", 2]]),
    ]),
    order("o-105", 105, tableOf("7"), 35, [round("seed-r6", "ready", 30, [["chicken-tikka", 1], ["shami-kebab", 2], ["naan", 3]])]),
    order("o-106", 106, tableOf("R2"), 20, [round("seed-r7", "preparing", 10, [["kacchi-full", 1], ["dal", 1], ["water", 2]])]),
    order(
      "o-107",
      107,
      tableOf("5"),
      12,
      [round("seed-r8", "pending_approval", 2, [["chicken-biryani", 1], ["beef-rezala", 1], ["naan", 2, "Extra butter"], ["lassi", 1]], "qr")],
      { guestName: "Tanvir" },
    ),
  ];
}
