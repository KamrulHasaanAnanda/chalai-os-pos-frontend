import "server-only";
import type { ClockState, StockGood, Reservation, ReservationDay, ReservationInput, ReservationStatus,
  CashMovement,
  Customer,
  CustomerCredit,
  DiscountInput,
  Floor,
  KitchenTicket,
  Kot,
  LoginResult,
  ManageBranch,
  ManageBranchPatch,
  ManageCoupon,
  ManageCouponInput,
  ManageQrHighlights,
  Me,
  MenuCategory,
  MenuItem,
  Order,
  OrderStatus,
  OrderSummary,
  Override,
  PaymentInput,
  PrintPending,
  Receipt,
  RoundInput,
  Shift,
  ShiftReport,
} from "./types";

const baseUrl = (
  process.env.CHALAI_API_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");

/** The spec's error envelope (§2), plus any extra fields the endpoint sends (e.g. `orderId` on `table_busy`). */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly errors: { field: string; message: string }[] = [],
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Init = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
  /** Sent as Idempotency-Key (offline outbox). */
  idempotencyKey?: string;
};

async function request<T>(
  path: string,
  { method = "GET", body, token, idempotencyKey }: Init = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      503,
      "api_unreachable",
      "The Chalai server can't be reached.",
    );
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  if (!response.ok) {
    const envelope = (json ?? {}) as Record<string, unknown>;
    throw new ApiError(
      response.status,
      typeof envelope.code === "string"
        ? envelope.code
        : response.status === 401
          ? "unauthorized"
          : "unknown",
      typeof envelope.message === "string"
        ? envelope.message
        : response.statusText,
      Array.isArray(envelope.errors)
        ? (envelope.errors as { field: string; message: string }[])
        : [],
      envelope,
    );
  }
  return json as T;
}

const q = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => !!e[1]),
  );
  return search.size ? `?${search}` : "";
};

/** Endpoints that don't need a session. */
export const publicApi = {
  login: (username: string, password: string) =>
    request<LoginResult>("/device/login", {
      method: "POST",
      body: { username, password, app: "pos" },
    }),
};

/** Every POS endpoint the app uses, bound to one session token. */
export function apiFor(token: string) {
  const get = <T>(path: string) => request<T>(path, { token });
  const post = <T>(path: string, body: unknown = {}) =>
    request<T>(path, { method: "POST", body, token });
  const withOverride = (override?: Override) => (override ? { override } : {});

  return {
    me: () => get<Me>("/device/me"),
    logout: () => post<void>("/device/logout"),
    changePassword: (currentPassword: string, newPassword: string) =>
      post<void>("/auth/change-password", { currentPassword, newPassword }),
    realtimeTicket: () =>
      post<{ ticket: string; expiresAt: string }>("/realtime/ticket"),

    floor: () => get<Floor>("/pos/floor"),
    /** A guest's call answered: it leaves everyone's notifications. */
    callDone: (callId: string) => post<void>(`/pos/calls/${encodeURIComponent(callId)}/done`),
    openOrder: (tableId: string | null) =>
      post<Order>("/pos/orders", { tableId }),
    orders: (params: { status?: OrderStatus; date?: string }) =>
      get<OrderSummary[]>(`/pos/orders${q(params)}`),
    order: (id: string) => get<Order>(`/pos/orders/${encodeURIComponent(id)}`),
    addRound: (orderId: string, input: RoundInput) =>
      post<Order>(`/pos/orders/${encodeURIComponent(orderId)}/rounds`, input),
    approveRound: (roundId: string) =>
      post<Order>(`/pos/rounds/${encodeURIComponent(roundId)}/approve`),
    rejectRound: (roundId: string, reason: string) =>
      post<Order>(`/pos/rounds/${encodeURIComponent(roundId)}/reject`, {
        reason,
      }),
    serveRound: (roundId: string) =>
      post<Order>(`/pos/rounds/${encodeURIComponent(roundId)}/served`),
    cancelItem: (itemId: string, reason: string, override?: Override) =>
      post<Order>(`/pos/order-items/${encodeURIComponent(itemId)}/cancel`, {
        reason,
        ...withOverride(override),
      }),
    discount: (orderId: string, input: DiscountInput) =>
      post<Order>(`/pos/orders/${encodeURIComponent(orderId)}/discount`, input),
    spendPoints: (orderId: string, points: number) =>
      post<Order>(`/pos/orders/${encodeURIComponent(orderId)}/loyalty`, { points }),
    returnPoints: (orderId: string) =>
      request<Order>(`/pos/orders/${encodeURIComponent(orderId)}/loyalty`, {
        method: "DELETE",
        token,
      }),
    applyCoupon: (orderId: string, code: string) =>
      post<Order>(`/pos/orders/${encodeURIComponent(orderId)}/coupon`, { code }),
    removeCoupon: (orderId: string) =>
      request<Order>(`/pos/orders/${encodeURIComponent(orderId)}/coupon`, {
        method: "DELETE",
        token,
      }),
    requestBill: (orderId: string) =>
      post<Order>(`/pos/orders/${encodeURIComponent(orderId)}/request-bill`),
    cancelOrder: (orderId: string, reason: string, override?: Override) =>
      post<Order>(`/pos/orders/${encodeURIComponent(orderId)}/cancel`, {
        reason,
        ...withOverride(override),
      }),
    mergeOrder: (orderId: string, intoOrderId: string) =>
      post<Order>(`/pos/orders/${encodeURIComponent(orderId)}/merge`, { intoOrderId }),
    pay: (orderId: string, input: PaymentInput) =>
      post<Order>(`/pos/orders/${encodeURIComponent(orderId)}/payments`, input),

    currentShift: () => get<{ shift: Shift | null }>("/pos/shifts/current"),
    startShift: (openingCashTaka: number | null) =>
      post<{ shift: Shift }>(
        "/pos/shifts",
        openingCashTaka === null ? {} : { openingCashTaka },
      ),
    shiftSoFar: () => get<ShiftReport>("/pos/shifts/current/report"),
    recordExpense: (category: string, amountTaka: number, note: string) =>
      post<unknown>("/pos/expenses", { category, amountTaka, note }),
    moveCash: (direction: "in" | "out", amountTaka: number, reason: string) =>
      post<CashMovement>("/pos/shifts/current/cash", { direction, amountTaka, reason }),
    endShift: (countedCashTaka: number | null) =>
      post<ShiftReport>(
        "/pos/shifts/current/end",
        countedCashTaka === null ? {} : { countedCashTaka },
      ),
    shiftReport: (id: string) =>
      get<ShiftReport>(`/pos/shifts/${encodeURIComponent(id)}`),

    menu: () => get<MenuCategory[]>("/menu"),
    setAvailability: (itemId: string, isAvailable: boolean) =>
      request<MenuItem>(
        `/menu/items/${encodeURIComponent(itemId)}/availability`,
        {
          method: "PATCH",
          body: { isAvailable },
          token,
        },
      ),
    setStock: (itemId: string, stockLeft: number | null) =>
      request<MenuItem>(`/menu/items/${encodeURIComponent(itemId)}/stock`, {
        method: "PATCH",
        body: { stockLeft },
        token,
      }),

    /** Staff-permissions manage APIs (owner grants on the Staff page). */
    manageCoupons: () => get<ManageCoupon[]>("/pos/manage/coupons"),
    createManageCoupon: (body: ManageCouponInput) =>
      post<ManageCoupon>("/pos/manage/coupons", body),
    updateManageCoupon: (id: string, body: Partial<ManageCouponInput> & { active?: boolean }) =>
      request<ManageCoupon>(`/pos/manage/coupons/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body,
        token,
      }),
    removeManageCoupon: (id: string) =>
      request<void>(`/pos/manage/coupons/${encodeURIComponent(id)}`, {
        method: "DELETE",
        token,
      }),
    manageBranch: () => get<ManageBranch>("/pos/manage/branch"),
    updateManageBranch: (body: Partial<ManageBranchPatch>) =>
      request<ManageBranch>("/pos/manage/branch", {
        method: "PATCH",
        body,
        token,
      }),
    manageQrHighlights: () => get<ManageQrHighlights>("/pos/manage/qr-highlights"),
    saveManageQrHighlights: (body: {
      popularItemIds: string[];
      offerTitle: string | null;
      offerBody: string | null;
    }) =>
      request<ManageQrHighlights>("/pos/manage/qr-highlights", {
        method: "PUT",
        body,
        token,
      }),

    tickets: () => get<KitchenTicket[]>("/kitchen/tickets"),
    kitchenHeartbeat: () => post<{ heardAt: string }>("/kitchen/heartbeat"),

    findCustomer: (phone: string) =>
      get<{ customer: Customer | null }>(`/pos/customers${q({ phone })}`),
    myAttendance: () => get<ClockState | null>("/pos/attendance/me"),
    clock: (body: { mobile?: string; pin?: string }) => post<ClockState>("/pos/attendance/clock", body),
    advanceStaff: () => get<{ id: string; name: string; role: string }[]>("/pos/advances/staff"),
    giveAdvance: (staffId: string, amountTaka: number, note: string) => post<unknown>("/pos/advances", { staffId, amountTaka, note }),
    stock: () => get<StockGood[]>("/pos/stock"),
    reservations: (date: string) =>
      get<ReservationDay>(`/pos/reservations${q({ date })}`),
    createReservation: (body: ReservationInput & { startsAt: string }) =>
      post<Reservation>("/pos/reservations", body),
    updateReservation: (id: string, body: Partial<ReservationInput> & { status?: ReservationStatus }) =>
      request<Reservation>(`/pos/reservations/${encodeURIComponent(id)}`, { method: "PATCH", body, token }),
    cancelReservation: (id: string) =>
      request<Reservation>(`/pos/reservations/${encodeURIComponent(id)}`, { method: "DELETE", token }),
    stockBranches: () => get<{ id: string; name: string }[]>("/pos/stock/branches"),
    sendStock: (goodId: string, toBranchId: string, quantity: number) =>
      post<unknown>("/pos/stock/transfers", { goodId, toBranchId, quantity }),
    customerCredit: (customerId: string) =>
      get<CustomerCredit>(`/pos/customers/${encodeURIComponent(customerId)}/credit`),
    collectCredit: (
      customerId: string,
      body: { method: "cash" | "bkash" | "nagad" | "card"; amountTaka: number; note?: string },
      idempotencyKey: string,
    ) =>
      request<CustomerCredit>(`/pos/customers/${encodeURIComponent(customerId)}/credit/collect`, {
        method: "POST",
        body,
        token,
        idempotencyKey,
      }),
    attachCustomer: (orderId: string, name: string, phone: string) =>
      request<Customer>(`/pos/orders/${encodeURIComponent(orderId)}/customer`, {
        method: "PUT",
        body: { name, phone },
        token,
      }),
    detachCustomer: (orderId: string) =>
      request<void>(`/pos/orders/${encodeURIComponent(orderId)}/customer`, {
        method: "DELETE",
        token,
      }),

    printPending: () => get<PrintPending>("/pos/print/pending"),
    sync: () => get<{ menuVersion: string; floorVersion: string }>("/pos/sync"),
    /** One offline outbox entry, sent as it was saved (the outbox route checks the path first). */
    replay: (path: string, body: unknown, idempotencyKey: string) =>
      request<unknown>(path, { method: "POST", body, token, idempotencyKey }),
    kot: (roundId: string) =>
      get<Kot>(`/pos/print/tickets/${encodeURIComponent(roundId)}`),
    markPrinted: (roundId: string, fallback: boolean) =>
      post<Kot>(`/pos/print/tickets/${encodeURIComponent(roundId)}`, {
        fallback,
      }),
    receipt: (orderId: string) =>
      get<Receipt>(`/pos/print/orders/${encodeURIComponent(orderId)}`),
    setTicketStatus: (roundId: string, status: "preparing" | "ready") =>
      post<KitchenTicket>(
        `/kitchen/tickets/${encodeURIComponent(roundId)}/status`,
        { status },
      ),
  };
}

export type SessionApi = ReturnType<typeof apiFor>;
