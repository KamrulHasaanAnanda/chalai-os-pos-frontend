import "server-only";
import type {
  DiscountInput,
  Floor,
  KitchenTicket,
  LoginResult,
  Me,
  MenuCategory,
  MenuItem,
  Order,
  OrderStatus,
  OrderSummary,
  Override,
  PaymentInput,
  RoundInput,
} from "./types";

const baseUrl = (process.env.CHALAI_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");

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

type Init = { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown; token?: string };

async function request<T>(path: string, { method = "GET", body, token }: Init = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(503, "api_unreachable", "The Chalai server can't be reached.");
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
      typeof envelope.code === "string" ? envelope.code : response.status === 401 ? "unauthorized" : "unknown",
      typeof envelope.message === "string" ? envelope.message : response.statusText,
      Array.isArray(envelope.errors) ? (envelope.errors as { field: string; message: string }[]) : [],
      envelope,
    );
  }
  return json as T;
}

const q = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]));
  return search.size ? `?${search}` : "";
};

/** Endpoints that don't need a session. */
export const publicApi = {
  login: (username: string, password: string) =>
    request<LoginResult>("/auth/login", { method: "POST", body: { username, password, app: "pos" } }),
};

/** Every POS endpoint the app uses, bound to one session token. */
export function apiFor(token: string) {
  const get = <T>(path: string) => request<T>(path, { token });
  const post = <T>(path: string, body: unknown = {}) => request<T>(path, { method: "POST", body, token });
  const withOverride = (override?: Override) => (override ? { override } : {});

  return {
    me: () => get<Me>("/auth/me"),
    logout: () => post<void>("/auth/logout"),
    changePassword: (currentPassword: string, newPassword: string) =>
      post<void>("/auth/change-password", { currentPassword, newPassword }),
    realtimeTicket: () => post<{ ticket: string; expiresAt: string }>("/realtime/ticket"),

    floor: () => get<Floor>("/pos/floor"),
    openOrder: (tableId: string | null) => post<Order>("/pos/orders", { tableId }),
    orders: (params: { status?: OrderStatus; date?: string }) => get<OrderSummary[]>(`/pos/orders${q(params)}`),
    order: (id: string) => get<Order>(`/pos/orders/${encodeURIComponent(id)}`),
    addRound: (orderId: string, input: RoundInput) => post<Order>(`/pos/orders/${encodeURIComponent(orderId)}/rounds`, input),
    approveRound: (roundId: string) => post<Order>(`/pos/rounds/${encodeURIComponent(roundId)}/approve`),
    rejectRound: (roundId: string, reason: string) =>
      post<Order>(`/pos/rounds/${encodeURIComponent(roundId)}/reject`, { reason }),
    serveRound: (roundId: string) => post<Order>(`/pos/rounds/${encodeURIComponent(roundId)}/served`),
    cancelItem: (itemId: string, reason: string, override?: Override) =>
      post<Order>(`/pos/order-items/${encodeURIComponent(itemId)}/cancel`, { reason, ...withOverride(override) }),
    discount: (orderId: string, input: DiscountInput) =>
      post<Order>(`/pos/orders/${encodeURIComponent(orderId)}/discount`, input),
    requestBill: (orderId: string) => post<Order>(`/pos/orders/${encodeURIComponent(orderId)}/request-bill`),
    cancelOrder: (orderId: string, reason: string, override?: Override) =>
      post<Order>(`/pos/orders/${encodeURIComponent(orderId)}/cancel`, { reason, ...withOverride(override) }),
    pay: (orderId: string, input: PaymentInput) => post<Order>(`/pos/orders/${encodeURIComponent(orderId)}/payments`, input),

    menu: () => get<MenuCategory[]>("/menu"),
    setAvailability: (itemId: string, isAvailable: boolean) =>
      request<MenuItem>(`/menu/items/${encodeURIComponent(itemId)}/availability`, {
        method: "PATCH",
        body: { isAvailable },
        token,
      }),

    tickets: () => get<KitchenTicket[]>("/kitchen/tickets"),
    setTicketStatus: (roundId: string, status: "preparing" | "ready") =>
      post<KitchenTicket>(`/kitchen/tickets/${encodeURIComponent(roundId)}/status`, { status }),
  };
}

export type SessionApi = ReturnType<typeof apiFor>;
