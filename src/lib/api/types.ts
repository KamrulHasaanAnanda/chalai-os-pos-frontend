/** Shapes from docs/platform-spec.md §5 and §8. Money is whole taka, timestamps are ISO 8601 UTC. */

export type Role =
  "superadmin" | "owner" | "manager" | "cashier" | "waiter" | "kitchen";

export type StaffPermissionScope = "branch" | "restaurant";

/** Owner-granted POS manage rights (staff-permissions design). */
export type StaffPermissions = {
  coupons?: StaffPermissionScope;
  menu?: StaffPermissionScope;
  branchInfo?: true;
  /** May close a bill on customer credit (বাকি). */
  credit?: true;
  /** A manager may send stock to another branch. */
  stock?: true;
  /** May add and change reservations. Only the owner has it without a grant. */
  reservations?: true;
};

export type ReservationStatus = "booked" | "seated" | "cancelled" | "no_show";

/** One booking (reservations spec). No table means it is on the waitlist. */
export type Reservation = {
  id: string;
  tableId: string | null;
  tableLabel: string | null;
  name: string;
  phone: string;
  partySize: number;
  startsAt: string;
  status: ReservationStatus;
};

export type ReservationDay = { holdMinutes: number; reservations: Reservation[] };

export type ReservationInput = {
  name: string;
  phone: string;
  partySize: number;
  startsAt?: string;
  tableId: string | null;
};

/** One good at this branch (stock spec). */
export type StockGood = {
  id: string;
  name: string;
  unit: "piece" | "packet" | "bottle" | "kg";
  quantity: number;
  low: boolean;
  expiredQuantity: number;
  expiringSoonQuantity: number;
  nextExpiry: string | null;
  daysLeft: number | null;
  suggestedOrder: number | null;
};

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
  /** Missing on older API builds. Owner always has all three at restaurant scope. */
  permissions?: StaffPermissions;
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
  /** Bill settings for the offline bill. Missing on older API builds and in the demo. */
  vatMode?: "exclusive" | "inclusive";
  serviceChargePercent?: number;
  roundToTaka?: boolean;
  timezone: string;
  /** Print settings (printing and KOT fallback spec). Missing on older API builds and in the demo: screen, 80 mm, on. */
  kotOutput?: KotOutput;
  receiptWidthMm?: ReceiptWidth;
  printerFallback?: boolean;
  /** The owner turned the cash drawer on (cash-drawer spec). Missing on older API builds and in the demo: off. */
  cashDrawer?: boolean;
  /** Bills may close on customer credit (বাকি). Missing on older API builds and in the demo: off. */
  creditEnabled?: boolean;
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

/** Coupon row from GET /pos/manage/coupons. */
export type ManageCoupon = {
  id: string;
  code: string;
  kind: "percent" | "amount";
  percent: number | null;
  amountTaka: number | null;
  maxDiscountTaka: number | null;
  minBillTaka: number;
  startsOn: string | null;
  endsOn: string | null;
  maxUses: number | null;
  oncePerCustomer: boolean;
  active: boolean;
  uses: number;
  createdAt: string;
};

export type ManageCouponInput = {
  code: string;
  kind: "percent" | "amount";
  percent?: number | null;
  amountTaka?: number | null;
  maxDiscountTaka?: number | null;
  minBillTaka?: number;
  startsOn?: string | null;
  endsOn?: string | null;
  maxUses?: number | null;
  oncePerCustomer?: boolean;
  active?: boolean;
};

/** Branch info from GET /pos/manage/branch. */
export type ManageBranch = {
  id: string;
  name: string;
  district: string;
  upazila: string;
  address: string;
  seats: number;
  phone: string | null;
  whatsapp: string | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryMinTaka: number;
  deliveryFeeTaka: number;
  deliveryArea: string;
  prepMinutes: number;
  hours: unknown;
  closures: unknown[];
};

export type ManageBranchPatch = {
  name?: string;
  district?: string;
  upazila?: string;
  address?: string;
  seats?: number;
  phone?: string | null;
  whatsapp?: string | null;
  pickupEnabled?: boolean;
  deliveryEnabled?: boolean;
  deliveryMinTaka?: number;
  deliveryFeeTaka?: number;
  deliveryArea?: string;
  prepMinutes?: number;
  hours?: unknown;
  closures?: unknown[];
};

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
  /** Today's booking holding this table now, or the next one later today (reservations spec). Missing in the demo. */
  nextReservation?: { name: string; partySize: number; at: string } | null;
};

/** A website order, pickup or delivery: no table, a token number for the day. */
export type FloorPickup = {
  id: string;
  number: number;
  tokenNo: number;
  /** For a delivery, when it should arrive. */
  pickupAt: string;
  guestName: string | null;
  /** Missing from an older API: a pickup. */
  type?: "pickup" | "delivery";
  delivery?: { address: string; payMethod: "cash" | "bkash" } | null;
  openedAt: string;
  totalTaka: number;
  pendingRounds: number;
  readyRounds: number;
  billRequested: boolean;
};

/** A booking still to come today (or being held now). No table means it is on the waitlist. */
export type FloorReservation = {
  id: string;
  name: string;
  partySize: number;
  at: string;
  tableId: string | null;
  tableLabel: string | null;
};

export type Floor = {
  areas: { id: string; name: string; tables: FloorTable[] }[];
  /** Missing from an older API. */
  pickups?: FloorPickup[];
  /** Today's bookings still to come. Missing from an older API. */
  reservations?: FloorReservation[];
  /** Guests' "Call waiter" / "Water" taps nobody has answered yet, oldest first. Missing from an older API. */
  calls?: FloorCall[];
  /** Open takeaway (parcel) orders from the counter, by token. Missing from an older API. */
  parcels?: FloorParcel[];
};

export type FloorParcel = {
  id: string;
  number: number;
  tokenNo: number | null;
  openedAt: string;
  totalTaka: number;
  readyRounds: number;
  billRequested: boolean;
};

export type FloorCall = {
  id: string;
  tableId: string;
  tableLabel: string;
  type: "waiter" | "water";
  orderId: string | null;
  createdAt: string;
};

export type OrderStatus = "open" | "paid" | "cancelled";
export type RoundStatus =
  "pending_approval" | "rejected" | "queued" | "preparing" | "ready" | "served";
export type PaymentMethod = "cash" | "bkash" | "nagad" | "card" | "credit";

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

/** A website delivery: where to, the flat charge on the bill, and how the guest pays. */
export type OrderDelivery = { address: string; feeTaka: number; payMethod: "cash" | "bkash" };

export type Order = {
  type?: "dine_in" | "pickup" | "parcel" | "delivery";
  pickupAt?: string | null;
  /** Delivery orders only; missing from an older API. */
  delivery?: OrderDelivery | null;
  id: string;
  number: number;
  /** The bill number the POS printed when it opened this order offline (`K7Q-0042`). */
  offlineRef?: string | null;
  tableId: string | null;
  tableLabel: string | null;
  /** Online pickup token; null for a table or counter order. */
  tokenNo?: number | null;
  areaName: string | null;
  status: OrderStatus;
  guestName: string | null;
  guestPhone: string | null;
  /** The customer on this bill, when the cashier attached one. Missing in the demo. */
  customer?: { id: string; name: string; phone: string; visitCount: number; points?: number } | null;
  /** Loyalty points spent on this bill, as a bill discount (loyalty spec). Missing in the demo. */
  loyalty?: { spent: number } | null;
  openedAt: string;
  closedAt: string | null;
  billRequestedAt: string | null;
  rounds: Round[];
  subtotalTaka: number;
  discountTaka: number;
  discountReason: string | null;
  /** The coupon on this bill: what it takes off now, or how much more to order for it (`shortTaka`). */
  coupon?: OrderCoupon | null;
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
  /** The bill number the POS printed when it opened this order offline (`K7Q-0042`). */
  offlineRef?: string | null;
  tableLabel: string | null;
  /** Online pickup token; null for a table or counter order. */
  tokenNo?: number | null;
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
  /** Online pickup token; null for a table or counter order. */
  tokenNo?: number | null;
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
/** `startedToday` is false for a shift left open from an earlier business day; missing from an older API. */
export type Shift = { id: string; staffName: string; startedAt: string; startedToday?: boolean };

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
  openTables: { label: string | null; number: number; type?: string; tokenNo?: number | null; dueTaka: number }[];
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
  /** Online pickup token; null for a table or counter order. */
  tokenNo?: number | null;
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
  /** Online pickup token; null for a table or counter order. */
  tokenNo?: number | null;
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
  /** Delivery orders: the charge, and the address and phone for the rider. Missing from an older API. */
  deliveryFeeTaka?: number;
  deliveryAddress?: string | null;
  guestPhone?: string | null;
  totalTaka: number;
  paidTaka: number;
  dueTaka: number;
  payments: { method: PaymentMethod; amountTaka: number; tenderedTaka: number | null; changeTaka: number; reference: string | null }[];
};

/** A guest the restaurant knows by phone (customers spec). */
export type Customer = { id: string; name: string; phone: string; visitCount: number; lastVisitAt: string | null; points?: number; creditBalanceTaka?: number; creditLimitTaka?: number | null };

/** Customer credit (বাকি): balance, limit and recent entries (customer credit spec). */
export type CreditEntry = {
  id: string;
  kind: "given" | "collected" | "written_off";
  amountTaka: number;
  method: "cash" | "bkash" | "nagad" | "card" | null;
  note: string;
  orderNumber: number | null;
  staffName: string;
  at: string;
};
export type CustomerCredit = {
  customer: { id: string; name: string; phone: string };
  balanceTaka: number;
  limitTaka: number | null;
  since: string | null;
  entries: CreditEntry[];
};

export type CashMovement = { direction: "in" | "out"; amountTaka: number; reason: string; at: string };

export type OrderCoupon = {
  code: string;
  kind: "percent" | "amount";
  percent: number | null;
  amountTaka: number | null;
  discountTaka: number;
  minBillTaka: number;
  shortTaka: number;
};

/** Clock in / out state for one person today (attendance spec). */
export type ClockState = {
  name?: string;
  clockedIn: boolean;
  since: string | null;
  firstInToday: string | null;
  late: boolean;
  lateMinutes: number;
  minutesToday: number;
};
