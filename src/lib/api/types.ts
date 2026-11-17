/** Shapes from docs/platform-spec.md §5 and §8. Money is whole taka, timestamps are ISO 8601 UTC. */

export type Role =
  "superadmin" | "owner" | "manager" | "cashier" | "waiter" | "kitchen";

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
  /** Print settings (printing and KOT fallback spec). Missing on older API builds and in the demo: screen, 80 mm, on. */
  kotOutput?: KotOutput;
  receiptWidthMm?: ReceiptWidth;
  printerFallback?: boolean;
  subscription: {
    status: string;
    billingPeriod: string;
    amountTaka: number;
    periodEnd: string | null;
  } | null;
  createdAt: string;
};

export type Me = {
  user: User;
  restaurant: Restaurant | null;
  actingAs: boolean;
};

export type LoginResult = { token: string; expiresAt: string; user: User };

export type TableStatus =
  "free" | "occupied" | "needs_approval" | "food_ready" | "bill_requested";

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

export type Floor = {
  areas: { id: string; name: string; tables: FloorTable[] }[];
};

export type OrderStatus = "open" | "paid" | "cancelled";
export type RoundStatus =
  "pending_approval" | "rejected" | "queued" | "preparing" | "ready" | "served";
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
  /** The customer on this bill, when the cashier attached one. Missing in the demo. */
  customer?: { id: string; name: string; phone: string; visitCount: number } | null;
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
  /** Portions left today. null = no count kept; at 0 the dish is sold out. */
  stockLeft?: number | null;
  sortOrder: number;
};

export type MenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
};

export type KitchenTicket = {
  /** The round id when station routing is off, the ticket's own id when it is on. Missing in the demo. */
  ticketId?: string;
  roundId: string;
  stationId?: string | null;
  stationName?: string | null;
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

export type DiscountInput = ({ amountTaka: number } | { percent: number }) & {
  reason: string;
  override?: Override;
};

/** guestName/guestPhone: optional customer details saved on the order with the payment. */
export type PaymentInput = {
  method: PaymentMethod;
  amountTaka: number;
  tenderedTaka?: number;
  reference?: string;
  guestName?: string;
  guestPhone?: string;
};

/** A staff member's open shift on the POS. */
export type Shift = { id: string; staffName: string; startedAt: string };

/** Made by the API when a shift ends. Money is what this person took; cancellations and open tables are the branch's. */
export type ShiftReport = {
  id: string;
  staffName: string;
  branchName: string;
  startedAt: string;
  endedAt: string;
  minutes: number;
  payments: {
    totalTaka: number;
    count: number;
    byMethod: Record<PaymentMethod, number>;
  };
  ordersClosed: number;
  cash: {
    /** Missing on reports made before opening cash and cash in/out existed. */
    openingTaka?: number;
    cashInTaka?: number;
    cashOutTaka?: number;
    /** Opening + cash payments + cash in − cash out. */
    expectedTaka: number;
    countedTaka: number | null;
    differenceTaka: number | null;
    movements?: CashMovement[];
  };
  cancelled: {
    orders: { number: number; reason: string | null }[];
    dishes: { name: string; quantity: number; reason: string | null }[];
  };
  openTables: { label: string | null; number: number; dueTaka: number }[];
};

export type KotOutput = "screen" | "printer" | "both";
export type ReceiptWidth = 58 | 80;

/** GET /pos/print/tickets/:roundId: one kitchen slip. No prices. */
export type Kot = {
  roundId: string;
  orderId: string;
  orderNumber: number;
  roundNumber: number;
  tableLabel: string | null;
  areaName: string | null;
  source: "qr" | "pos";
  sentBy: string | null;
  sentAt: string;
  note: string | null;
  printedAt: string | null;
  printedFallback: boolean;
  items: { name: string; quantity: number; note: string | null }[];
};

/** GET /pos/print/pending: what the POS should print by itself now. */
export type PrintPending = {
  settings: { kotOutput: KotOutput; receiptWidthMm: ReceiptWidth; printerFallback: boolean };
  kitchenSeenAt: string | null;
  rounds: Kot[];
};

/** GET /pos/print/orders/:orderId: a receipt, totals from the API's bill calculation. */
export type Receipt = {
  orderId: string;
  billNumber: number;
  status: "open" | "paid" | "cancelled";
  restaurantName: string;
  branchName: string;
  branchAddress: string;
  tableLabel: string | null;
  areaName: string | null;
  guestName: string | null;
  openedAt: string;
  closedAt: string | null;
  receiptWidthMm: ReceiptWidth;
  items: { name: string; quantity: number; unitPriceTaka: number; lineTotalTaka: number }[];
  subtotalTaka: number;
  discountTaka: number;
  serviceChargePercent: number;
  serviceChargeTaka: number;
  vatPercent: number;
  vatMode: "exclusive" | "inclusive";
  vatTaka: number;
  roundingTaka: number;
  totalTaka: number;
  paidTaka: number;
  dueTaka: number;
  payments: { method: PaymentMethod; amountTaka: number; tenderedTaka: number | null; changeTaka: number; reference: string | null }[];
};

/** A guest the restaurant knows by phone (customers spec). */
export type Customer = { id: string; name: string; phone: string; visitCount: number; lastVisitAt: string | null };

export type CashMovement = { direction: "in" | "out"; amountTaka: number; reason: string; at: string };
