"use client";
// Frontend-only demo: every screen of the static build. Each reads the demo store (src/demo/store.ts) and renders the
// same view the real server page does; deploy/shared-hosting/prepare.mjs puts the thin src/demo/routes files in place
// of the server pages. Nothing renders until the store is read in the browser, so the static HTML is only a skeleton.

import {
  ArrowRightIcon,
  ChefHatIcon,
  ConciergeBellIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { login } from "@/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { Icon } from "@/components/icons";
import { KitchenBoard } from "@/components/kitchen-board";
import { KitchenShell, PosShell } from "@/components/shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Field, Notice } from "@/components/app/field";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/app/submit-button";
import { BillView } from "@/components/views/bill-view";
import { FloorView } from "@/components/views/floor-view";
import { IncomingView } from "@/components/views/incoming-view";
import { MenuView } from "@/components/views/menu-view";
import { OrderView } from "@/components/views/order-view";
import { orderStatuses, OrdersView } from "@/components/views/orders-view";
import { ReceiptView } from "@/components/views/receipt-view";
import type { Role } from "@/lib/api/types";
import { errorReader } from "@/lib/error-reader";
import { receiptFromOrder } from "@/lib/order";
import { businessDate } from "@/lib/format";
import { incomingFrom } from "@/lib/incoming";
import {
  billRoles,
  floorRoles,
  homeFor,
  kitchenRoles,
  managerRoles,
} from "@/lib/roles";
import type { Staff } from "@/lib/session";
import { DemoControls } from "./controls";
import { DEMO_PASSWORD, demoUsers } from "./data";
import { useActionRouter } from "./navigation";
import {
  floor,
  getState,
  me,
  orderSummaries,
  subscribe,
  tickets,
  type DemoState,
} from "./store";

const noState = () => null;

/** The demo store; null on the server and during hydration. */
function useDemoState(): DemoState | null {
  return useSyncExternalStore(subscribe, getState, noState);
}

function useErrors() {
  const params = useSearchParams();
  const t = useTranslations("errors");
  return errorReader(Object.fromEntries(params), t);
}

/**
 * lib/session.ts requireStaff() for the demo: not logged in → /login, a role that isn't allowed here → its own home.
 * Returns null until the check passes.
 */
function useStaff(roles?: Role[]): { state: DemoState; staff: Staff } | null {
  useActionRouter();
  const router = useRouter();
  const state = useDemoState();
  const current = state ? me(state) : null;
  const role = current?.user.role;
  const allowed = !!role && (!roles || roles.includes(role));
  const waiting = state === null;

  useEffect(() => {
    if (waiting) return;
    if (!role) router.replace("/login");
    else if (!allowed) router.replace(homeFor(role));
  }, [waiting, role, allowed, router]);

  if (!state || !current?.restaurant || !allowed) return null;
  return {
    state,
    staff: { user: current.user, restaurant: current.restaurant },
  };
}

function Loading({ dark = false }: { dark?: boolean }) {
  return (
    <div className="mx-auto max-w-[960px] space-y-3 p-4">
      <Skeleton className={cn("h-10 w-48", dark && "bg-white/10")} />
      <Skeleton className={cn("h-28", dark && "bg-white/10")} />
      <Skeleton className={cn("h-28", dark && "bg-white/10")} />
    </div>
  );
}

export function DemoHome() {
  useActionRouter();
  const router = useRouter();
  const state = useDemoState();
  const welcome = useSearchParams().get("welcome") === "1";
  const role = state ? me(state)?.user.role : undefined;
  useEffect(() => {
    if (!state) return;
    router.replace(
      role ? `${homeFor(role)}${welcome ? "?welcome=1" : ""}` : "/login",
    );
  }, [state, role, welcome, router]);
  return null;
}

/** Redirects pages the demo doesn't have (password change, plan page) to the start. */
export function DemoRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => router.replace(to), [router, to]);
  return null;
}

/** Solid colour + icon per role on the demo's "Who's working?" tiles. */
const ROLE_TILES: Partial<
  Record<Role, { icon: typeof WalletIcon; tone: string }>
> & { manager: { icon: typeof WalletIcon; tone: string } } = {
  manager: { icon: ShieldCheckIcon, tone: "bg-indigo-500" },
  cashier: { icon: WalletIcon, tone: "bg-emerald-600" },
  waiter: { icon: ConciergeBellIcon, tone: "bg-orange-500" },
  kitchen: { icon: ChefHatIcon, tone: "bg-rose-500" },
};

export function DemoLogin() {
  useActionRouter();
  const router = useRouter();
  const state = useDemoState();
  const t = useTranslations("login");
  const tDemo = useTranslations("demo");
  const tRoles = useTranslations("roles");
  const error = useErrors();
  // Already logged in when the page opened → home. Only checked once: after logging in here, the action redirects.
  const checked = useRef(false);
  useEffect(() => {
    if (!state || checked.current) return;
    checked.current = true;
    const role = me(state)?.user.role;
    if (role) router.replace(homeFor(role));
  }, [state, router]);

  return (
    <AuthCard
      title={t("title")}
      body={t("body")}
      footer={<p className="text-[13px] text-muted-foreground">{t("help")}</p>}
      aside={
        <div>
          <p className="text-[12.5px] font-semibold tracking-wide text-zinc-400 uppercase">
            {tDemo("whoIsWorking")}
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2.5">
            {demoUsers.map((u) => {
              const role = ROLE_TILES[u.role] ?? ROLE_TILES.manager;
              const RoleIcon = role.icon;
              return (
                <li key={u.id}>
                  <form action={login}>
                    <input type="hidden" name="username" value={u.username} />
                    <input
                      type="hidden"
                      name="password"
                      value={DEMO_PASSWORD}
                    />
                    <button
                      type="submit"
                      className="group flex min-h-[68px] w-full items-center gap-3 rounded-xl bg-white/5 p-3 text-left ring-1 ring-white/10 transition duration-150 hover:bg-white/10 hover:ring-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    >
                      <span
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-lg text-white",
                          role.tone,
                        )}
                      >
                        <RoleIcon className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-[15px] font-bold text-white">
                          {u.name.split(" ")[0]}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] text-zinc-400">
                          {tRoles(u.role)}
                        </span>
                      </span>
                      <ArrowRightIcon
                        className="hidden size-4 shrink-0 text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-white sm:block"
                        aria-hidden
                      />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 flex gap-2 rounded-lg bg-orange-500/10 px-3 py-2.5 text-[13px] text-orange-100 ring-1 ring-orange-400/20">
            <SparklesIcon
              className="mt-0.5 size-4 shrink-0 text-orange-400"
              aria-hidden
            />
            <span>{tDemo("loginBody", { password: DEMO_PASSWORD })}</span>
          </p>
        </div>
      }
    >
      <form action={login} className="space-y-4">
        {error.message && (
          <Notice
            tone={error.param("error") === "session_expired" ? "info" : "error"}
          >
            {error.message}
          </Notice>
        )}
        <Field
          name="username"
          label={t("username")}
          defaultValue={error.param("username")}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <Field
          name="password"
          type="password"
          label={t("password")}
          autoComplete="current-password"
          required
        />
        <SubmitButton variant="default" size="lg" className="w-full">
          {t("submit")}
        </SubmitButton>
      </form>
    </AuthCard>
  );
}

export function DemoStaffLayout({ children }: { children: ReactNode }) {
  const gate = useStaff();
  if (!gate) return <Loading />;
  return (
    <PosShell
      staff={gate.staff}
      extra={<DemoControls role={gate.staff.user.role} />}
    >
      {children}
    </PosShell>
  );
}

export function DemoKitchenLayout({ children }: { children: ReactNode }) {
  const gate = useStaff(kitchenRoles);
  if (!gate) return <Loading dark />;
  return (
    <KitchenShell
      staff={gate.staff}
      extra={<DemoControls role={gate.staff.user.role} dark />}
    >
      {children}
    </KitchenShell>
  );
}

export function DemoFloor() {
  const gate = useStaff(floorRoles);
  const error = useErrors();
  if (!gate) return <Loading />;
  return (
    <FloorView floor={floor(gate.state)} user={gate.staff.user} error={error} />
  );
}

export function DemoOrders() {
  const gate = useStaff(floorRoles);
  const params = useSearchParams();
  if (!gate) return <Loading />;
  const tz = gate.staff.restaurant.timezone;
  const today = businessDate(tz);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") ?? "")
    ? params.get("date")!
    : today;
  const status = orderStatuses.find((s) => s === params.get("status"));
  return (
    <OrdersView
      orders={orderSummaries(gate.state, { status, date })}
      status={status}
      date={date}
      today={today}
      timeZone={tz}
    />
  );
}

export function DemoIncoming() {
  const gate = useStaff(floorRoles);
  const error = useErrors();
  const state = gate?.state;
  const incoming = useMemo(() => incomingFrom(state?.orders ?? []), [state]);
  if (!gate) return <Loading />;
  return (
    <IncomingView
      incoming={incoming}
      user={gate.staff.user}
      timeZone={gate.staff.restaurant.timezone}
      error={error}
    />
  );
}

/** The order for ?id=, or a not-found message (it may belong to data that was reset). */
function useOrder(roles: Role[]) {
  const gate = useStaff(roles);
  const id = useSearchParams().get("id");
  const order = gate?.state.orders.find((o) => o.id === id) ?? null;
  return { gate, order };
}

function OrderMissing() {
  const t = useTranslations("error");
  return (
    <div className="mx-auto flex min-h-[50dvh] max-w-[520px] flex-col items-center justify-center text-center">
      <h1 className="text-[22px] font-semibold">{t("notFoundTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("notFoundBody")}</p>
      <Link
        href="/floor"
        className={`${buttonVariants({ variant: "default", size: "lg" })} mt-5`}
      >
        <Icon name="grid" />
        {t("home")}
      </Link>
    </div>
  );
}

export function DemoOrder() {
  const { gate, order } = useOrder(floorRoles);
  const error = useErrors();
  if (!gate) return <Loading />;
  if (!order) return <OrderMissing />;
  const menu = order.status === "open" ? gate.state.menu : null;
  return (
    <OrderView
      order={order}
      menu={menu}
      user={gate.staff.user}
      timeZone={gate.staff.restaurant.timezone}
      error={error}
    />
  );
}

export function DemoBill() {
  const { gate, order } = useOrder(billRoles);
  const error = useErrors();
  if (!gate) return <Loading />;
  if (!order) return <OrderMissing />;
  return (
    <BillView
      order={order}
      user={gate.staff.user}
      timeZone={gate.staff.restaurant.timezone}
      error={error}
    />
  );
}

export function DemoReceipt() {
  const { gate, order } = useOrder(billRoles);
  if (!gate) return <Loading />;
  if (!order) return <OrderMissing />;
  return <ReceiptView receipt={receiptFromOrder(order, gate.staff.restaurant)} timeZone={gate.staff.restaurant.timezone} />;
}

export function DemoMenu() {
  const gate = useStaff(managerRoles);
  const error = useErrors();
  if (!gate) return <Loading />;
  return <MenuView menu={gate.state.menu} error={error} />;
}

export function DemoKitchen() {
  const gate = useStaff(kitchenRoles);
  const state = gate?.state;
  const list = useMemo(() => (state ? tickets(state) : []), [state]);
  if (!gate) return <Loading dark />;
  return <KitchenBoard tickets={list} />;
}
