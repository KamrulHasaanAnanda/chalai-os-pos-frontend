/** Shapes from docs/platform-spec.md §5 and §8. Money is whole taka, timestamps are ISO 8601 UTC. */

export type Role = "superadmin" | "owner" | "manager" | "cashier" | "waiter" | "kitchen";

export type User = {
  id: string;
  role: Role;
  name: string;
  phone: string;
  username: string;
  mustChangePassword: boolean;
  isActive: boolean;
  restaurantId: string | null;
  lastLoginAt: string | null;
};

export type Restaurant = {
  id: string;
  name: string;
  area: string;
  logoUrl: string | null;
  plan: string;
  modules: string[];
  status: "active" | "suspended";
  onboardingStep: string;
  vatPercent: number;
  timezone: string;
  subscription: { status: string; billingPeriod: string; amountTaka: number; periodEnd: string | null } | null;
  createdAt: string;
};

export type Me = { user: User; restaurant: Restaurant | null; actingAs: boolean };

export type LoginResult = { token: string; expiresAt: string; user: User };

export type TableStatus = "free" | "occupied" | "needs_approval" | "food_ready" | "bill_requested";

export type FloorTable = {
  id: string;
  label: string;
  seats: number;
  gridX: number | null;
  gridY: number | null;
  status: TableStatus;
  order: null | {
    id: string;
    number: number;
    openedAt: string;
    totalTaka: number;
    pendingRounds: number;
    readyRounds: number;
    billRequested: boolean;
  };
};

export type Floor = { areas: { id: string; name: string; tables: FloorTable[] }[] };

export type OrderStatus = "open" | "paid" | "cancelled";
export type RoundStatus = "pending_approval" | "rejected" | "queued" | "preparing" | "ready" | "served";
export type PaymentMethod = "cash" | "bkash" | "nagad" | "card";

export type OrderItem = {
  id: string;
  menuItemId: string | null;
  name: string;
  unitPriceTaka: number;
  quantity: number;
  note: string | null;
  lineTotalTaka: number;
  cancelledAt: string | null;
  cancelReason: string | null;
};

export type Round = {
  id: string;
  source: "qr" | "pos";
  status: RoundStatus;
  note: string | null;
  createdAt: string;
  approvedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
  rejectedReason: string | null;
  createdBy: { id: string; name: string } | null;
  items: OrderItem[];
};

export type Payment = {
  id: string;
  method: PaymentMethod;
  amountTaka: number;
  tenderedTaka: number | null;
  reference: string | null;
  receivedBy: { id: string; name: string };
  createdAt: string;
};

export type Order = {
  id: string;
  number: number;
  tableId: string | null;
  tableLabel: string | null;
  areaName: string | null;
  status: OrderStatus;
  guestName: string | null;
  guestPhone: string | null;
  openedAt: string;
  closedAt: string | null;
  billRequestedAt: string | null;
  rounds: Round[];
  subtotalTaka: number;
  discountTaka: number;
  discountReason: string | null;
  vatPercent: number;
  vatTaka: number;
  totalTaka: number;
  paidTaka: number;
  dueTaka: number;
  payments: Payment[];
};

export type OrderSummary = {
  id: string;
  number: number;
  tableLabel: string | null;
  status: OrderStatus;
  totalTaka: number;
  dueTaka: number;
  openedAt: string;
  closedAt: string | null;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceTaka: number;
  photoUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
};

export type MenuCategory = { id: string; name: string; sortOrder: number; items: MenuItem[] };

export type KitchenTicket = {
  roundId: string;
  orderId: string;
  orderNumber: number;
  tableLabel: string | null;
  areaName: string | null;
  status: "queued" | "preparing" | "ready";
  note: string | null;
  createdAt: string;
  approvedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  items: { id: string; name: string; quantity: number; note: string | null }[];
};

/** A manager's username + password, for endpoints marked (override) in the spec. */
export type Override = { username: string; password: string };

export type RoundInput = {
  items: { menuItemId: string; quantity: number; note?: string }[];
  note?: string;
  clientRequestId: string;
};

export type DiscountInput = ({ amountTaka: number } | { percent: number }) & { reason: string; override?: Override };

export type PaymentInput = { method: PaymentMethod; amountTaka: number; tenderedTaka?: number; reference?: string };
