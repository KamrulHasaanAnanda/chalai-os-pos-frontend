import "server-only";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { ApiError, apiFor, type SessionApi } from "@/lib/api/client";
import type { Me, Restaurant, Role, User } from "@/lib/api/types";

const cookieName = "chalai_pos_session";

/** Where a 401 seen while rendering goes: a route handler that clears the cookie (pages can't) and sends to /login. */
export const expiredPath = "/api/session/expired";

export const floorRoles: Role[] = ["owner", "manager", "cashier", "waiter"];
export const billRoles: Role[] = ["owner", "manager", "cashier"];
export const managerRoles: Role[] = ["owner", "manager"];
export const kitchenRoles: Role[] = ["owner", "manager", "kitchen"];

/** Cashiers and waiters need a manager's username + password for discounts and cancellations. */
export const needsOverride = (role: Role) => !managerRoles.includes(role);

export function homeFor(role: Role): string {
  return role === "kitchen" ? "/kitchen" : "/floor";
}

/** Called from the login server action. Secure whenever the page was served over https. */
export async function setSessionCookie(token: string) {
  const origin = (await headers()).get("origin") ?? "";
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    // Not on plain http, so a tablet on the restaurant's local network still works in development.
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    // The API decides when the session ends (16 h sliding); a 401 clears this cookie.
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Only in server actions and route handlers. */
export async function clearSessionCookie() {
  (await cookies()).delete(cookieName);
}

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(cookieName)?.value;
}

/** Turns API errors seen while rendering into the right page. Anything else goes to the error boundary. */
function handleRenderError(error: unknown): never {
  if (error instanceof ApiError) {
    if (error.statusCode === 401 || error.code === "account_disabled") redirect(expiredPath);
    if (error.code === "module_not_in_plan") redirect("/no-plan");
    if (error.code === "restaurant_suspended") redirect("/no-plan?reason=suspended");
    if (error.statusCode === 404) notFound();
  }
  throw error;
}

/** The signed-in user's API, for Server Components. No cookie → /login. */
export const sessionApi = cache(async (): Promise<SessionApi> => {
  const token = await sessionToken();
  if (!token) redirect("/login");
  return apiFor(token);
});

/** Loads data for a page; 401, plan and not-found errors become redirects / 404. */
export async function load<T>(fn: (api: SessionApi) => Promise<T>): Promise<T> {
  const api = await sessionApi();
  try {
    return await fn(api);
  } catch (error) {
    handleRenderError(error);
  }
}

/** GET /auth/me once per request. */
export const getMe = cache(async (): Promise<Me> => load((api) => api.me()));

/** For the login page: the current user if the cookie is still good, otherwise null (never redirects). */
export async function peekMe(): Promise<Me | null> {
  const token = await sessionToken();
  if (!token) return null;
  try {
    return await apiFor(token).me();
  } catch {
    return null;
  }
}

export type Staff = { user: User; restaurant: Restaurant };

/**
 * For every signed-in page. Checks the session, the forced password change, the role and the plan, all on the server.
 * A role that isn't allowed here goes to its own home page.
 */
export async function requireStaff({
  roles,
  module = "pos",
  passwordChange = false,
}: { roles?: Role[]; module?: "pos" | "kitchen"; passwordChange?: boolean } = {}): Promise<Staff> {
  const me = await getMe();
  if (!me.restaurant) redirect(expiredPath);
  if (me.user.mustChangePassword && !passwordChange) redirect("/change-password");
  if (roles && !roles.includes(me.user.role)) redirect(homeFor(me.user.role));
  if (!passwordChange) {
    const needed = me.user.role === "kitchen" ? "kitchen" : module;
    if (!me.restaurant.modules.includes(needed)) redirect("/no-plan");
  }
  return { user: me.user, restaurant: me.restaurant };
}

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/**
 * For server actions: runs one API call with the session. A 401 clears the cookie and goes to /login;
 * a missing module goes to the plan page. Other API errors come back for the form to show.
 */
export async function act<T>(fn: (api: SessionApi) => Promise<T>): Promise<ActionResult<T>> {
  const token = await sessionToken();
  if (!token) redirect("/login");
  try {
    return { ok: true, data: await fn(apiFor(token)) };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.statusCode === 401) {
      await clearSessionCookie();
      redirect("/login?error=session_expired");
    }
    if (error.code === "module_not_in_plan") redirect("/no-plan");
    return { ok: false, error };
  }
}
