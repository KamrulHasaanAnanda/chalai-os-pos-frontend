/* eslint-disable @next/next/no-img-element -- the Chalai OS wordmark */
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Suspense, type ReactNode } from "react";
import { ChalaiBotMount } from "@/components/chalai-bot";
import { Icon } from "@/components/icons";
import { LiveSync } from "@/components/live-sync";
import { NotificationBell } from "@/components/notification-bell";
import { LanguageSwitch } from "@/components/language-switch";
import { LogoutButton } from "@/components/logout-button";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { RailFrame, RailToggle } from "@/components/rail-frame";
import { SessionGate } from "@/components/session-gate";
import { KotPrinter } from "@/components/print/kot-printer";
import { CashDrawerButton, DrawerSetting } from "@/components/cash-drawer";
import { Avatar } from "@/components/app/staff-avatar";
import { Toast } from "@/components/app/toast";
import type { StaffPermissions, User } from "@/lib/api/types";
import { billRoles, managerRoles } from "@/lib/roles";
import type { Staff } from "@/lib/session";
import { cn } from "@/lib/utils";

/** The static demo has no API to print from. */
const demo = process.env.CHALAI_DEMO === "1";

function effectivePermissions(user: User): StaffPermissions {
  if (user.role === "owner") {
    return { coupons: "restaurant", menu: "restaurant", branchInfo: true, qrHighlights: true };
  }
  return user.permissions ?? {};
}

export function useNavItems(user: User, creditEnabled = false): NavItem[] {
  const t = useTranslations("nav");
  const role = user.role;
  const perms = effectivePermissions(user);
  const items: NavItem[] = [];
  if (role !== "kitchen") {
    items.push(
      { href: "/floor", label: t("floor"), icon: "grid" },
      { href: "/tables", label: t("tables"), icon: "seat" },
      { href: "/reservations", label: t("reservations"), icon: "calendar" },
      { href: "/incoming", label: t("incoming"), icon: "bell" },
      { href: "/orders", label: t("orders"), icon: "receipt" },
    );
  }
  if (creditEnabled && billRoles.includes(role))
    items.push({ href: "/credit", label: t("credit"), icon: "receipt" });
  items.push({ href: "/stock", label: t("stock"), icon: "package" });
  if (managerRoles.includes(role) || perms.menu)
    items.push({ href: "/menu", label: t("menu"), icon: "book" });
  if (perms.coupons)
    items.push({ href: "/manage/coupons", label: t("coupons"), icon: "coupon" });
  if (perms.branchInfo)
    items.push({ href: "/manage/branch", label: t("branch"), icon: "store" });
  // Deals change prices, so promotions follow the menu grant.
  if (managerRoles.includes(role) || perms.menu)
    items.push({ href: "/manage/promotions", label: t("promotions"), icon: "megaphone" });
  if (managerRoles.includes(role) || perms.qrHighlights)
    items.push({ href: "/manage/qr-highlights", label: t("qrHighlights"), icon: "sparkles" });
  if (role === "owner" || role === "manager" || role === "kitchen")
    items.push({ href: "/kitchen", label: t("kitchen"), icon: "chef" });
  return items;
}

/** Top bar: logo + restaurant, live connection dot, user + role, logout. `dark` is the kitchen screen. */
export function TopBar({
  staff,
  dark = false,
  extra,
}: {
  staff: Staff;
  dark?: boolean;
  extra?: ReactNode;
}) {
  const t = useTranslations("common");
  const tRoles = useTranslations("roles");
  const { user } = staff;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-16 border-b print:hidden",
        dark ? "border-white/10 bg-night text-white" : "border-line bg-card",
      )}
    >
      <div className="flex h-full items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center">
          <RestaurantMark staff={staff} dark={dark} />
        </div>
        {extra}
        <LiveSync
          dark={dark}
          labels={{
            live: t("live"),
            connecting: t("connecting"),
            offline: t("offline"),
          }}
          offlineLabels={{
            syncing: t("syncing", { n: "{n}" }),
            openTill: t("openTill"),
          }}
        />
        <div className="hidden items-center gap-2.5 sm:flex">
          <Avatar
            name={user.name}
            role={user.role}
            className={dark ? "bg-white/10 text-white" : undefined}
          />
          <div className="leading-tight">
            <p
              className="max-w-[140px] truncate text-[14px] font-semibold"
              title={user.name}
            >
              {user.name}
            </p>
            <p
              className={cn(
                "text-[12px]",
                dark ? "text-white/55" : "text-muted-foreground",
              )}
            >
              {tRoles(user.role)}
            </p>
          </div>
        </div>
        <LanguageSwitch
          className={cn(
            dark
              ? "border-white/20 text-white/80 hover:bg-white/10"
              : "hover:bg-gray",
          )}
        />
        <LogoutButton
          userId={user.id}
          className={cn(
            "flex size-12 items-center justify-center rounded-md transition-colors duration-150",
            dark
              ? "text-white/70 hover:bg-white/10 hover:text-white"
              : "text-muted-foreground hover:bg-gray hover:text-ink",
          )}
        >
          <Icon name="logout" />
        </LogoutButton>
      </div>
    </header>
  );
}

function RestaurantMark({
  staff,
  dark = false,
}: {
  staff: Staff;
  dark?: boolean;
}) {
  const { restaurant } = staff;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <img
        src={
          dark ? "/brand/logo-en-on-dark.svg" : "/brand/logo-en-on-light.svg"
        }
        alt="Chalai OS"
        width={440}
        height={100}
        className="h-5 w-auto self-start"
      />
      <p
        className={cn(
          "truncate text-[12px] font-medium",
          dark ? "text-zinc-400" : "text-muted-foreground",
        )}
        title={restaurant.name}
      >
        {restaurant.name}
      </p>
    </div>
  );
}

/** POS shell: labelled sidebar on tablet/desktop, a slim top bar, bottom tabs on phones. `extra` goes into the top bar. */
export function PosShell({
  staff,
  extra,
  children,
}: {
  staff: Staff;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  const tRoles = useTranslations("roles");
  const tKot = useTranslations("kot");
  const tNav = useTranslations("nav");
  const items = useNavItems(staff.user, staff.restaurant.creditEnabled ?? false);
  const service = items.filter((i) =>
    ["/floor", "/tables", "/incoming", "/orders"].includes(i.href),
  );
  const manage = items.filter((i) => !service.includes(i));
  const { user } = staff;

  return (
    <RailFrame>
      <aside
        aria-label={t("mainNav")}
        className="shell-aside fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-x-hidden bg-[#18181b] text-zinc-300 md:flex print:hidden"
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-4">
          <img
            src="/brand/logo-en-on-dark.svg"
            alt="Chalai OS"
            width={440}
            height={100}
            className="rail-hide h-5 w-auto"
          />
          <RailToggle keepOpen={t("railKeepOpen")} fold={t("railFold")} />
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <GroupLabel>{tNav("restaurant")}</GroupLabel>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] p-2">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-orange-500/15 text-[13px] font-semibold text-orange-300"
            >
              {staff.restaurant.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="rail-hide min-w-0 leading-tight">
              <span
                className="block truncate text-[13.5px] font-medium text-white"
                title={staff.restaurant.name}
              >
                {staff.restaurant.name}
              </span>
              <span className="block text-[11.5px] text-zinc-500">
                {t("pos")}
              </span>
            </span>
          </div>
          <SessionGate nav userId={user.id} userName={user.name}>
            {service.length > 0 && (
              <>
                <GroupLabel>{tNav("service")}</GroupLabel>
                <NavLinks items={service} variant="rail" />
              </>
            )}
            {manage.length > 0 && (
              <>
                <GroupLabel>{tNav("manage")}</GroupLabel>
                <NavLinks items={manage} variant="rail" />
              </>
            )}
          </SessionGate>
        </nav>
        <div className="flex flex-col gap-1 border-t border-white/10 p-2">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-[13px] font-semibold text-orange-300 uppercase"
            >
              {user.name.trim().charAt(0)}
            </span>
            <span className="rail-hide min-w-0 leading-tight">
              <span
                className="block truncate text-[13.5px] font-medium text-white"
                title={user.name}
              >
                {user.name}
              </span>
              <span className="block text-[11.5px] text-zinc-500">
                {tRoles(user.role)}
              </span>
            </span>
          </div>
          <LogoutButton
            userId={user.id}
            formClassName="w-full"
            className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[13.5px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white [&>svg]:size-4 [&>svg]:text-zinc-500"
          >
            <Icon name="logout" />
            <span className="rail-hide">{t("logout")}</span>
          </LogoutButton>
        </div>
      </aside>

      <div className="shell-content md:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card px-4 sm:px-6 print:hidden">
          <div className="min-w-0 flex-1 md:hidden">
            <RestaurantMark staff={staff} />
          </div>
          {/* Pages can put their title here (TopBarStart), so the top bar and the page head are one row. */}
          <div id="topbar-start" className="hidden min-w-0 flex-1 items-center gap-3 md:flex" />
          {extra}
          {/* The demo has no API behind /api/notifications. */}
          {!demo && user.role !== "kitchen" && <NotificationBell />}
          <LanguageSwitch className="hover:bg-muted" />
          <LiveSync
            labels={{
              live: t("live"),
              connecting: t("connecting"),
              offline: t("offline"),
            }}
            offlineLabels={{
              syncing: t("syncing", { n: "{n}" }),
              openTill: t("openTill"),
            }}
          />
          {!demo && <DrawerSetting enabled={staff.restaurant.cashDrawer === true} />}
          {!demo && staff.restaurant.cashDrawer === true && billRoles.includes(user.role) && <CashDrawerButton />}
          {!demo && (
            <Suspense fallback={null}>
              {/* The till (cashier, manager, owner) prints for a silent kitchen; waiters' phones never pop a dialog. */}
              <KotPrinter
                fallback={
                  billRoles.includes(user.role) &&
                  staff.restaurant.printerFallback !== false
                }
                printingLabel={tKot("printing")}
              />
            </Suspense>
          )}
          <LogoutButton
            userId={staff.user.id}
            formClassName="md:hidden"
            className="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Icon name="logout" className="size-5" />
          </LogoutButton>
        </header>
        <main className="px-4 pt-6 pb-28 sm:px-6 md:pb-10 lg:px-8">
          {user.role === "kitchen" ? (
            children
          ) : (
            <SessionGate userId={user.id} userName={user.name}>
              {children}
            </SessionGate>
          )}
        </main>
      </div>

      <nav
        aria-label={t("mainNav")}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      >
        <SessionGate nav userId={user.id} userName={user.name}>
          <NavLinks items={items} variant="bottom" />
        </SessionGate>
      </nav>
      <Suspense>
        <Toast />
      </Suspense>
      <ChalaiBotMount name={staff.restaurant.name} />
    </RailFrame>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="rail-hide flex h-7 items-center px-2 pt-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase first:pt-0 [&:not(:first-child)]:mt-2">
      {children}
    </p>
  );
}

/** For managers on the kitchen screen: one quiet link back to the floor. */
export function BackToFloor() {
  const t = useTranslations("kitchen");
  return (
    <Link
      href="/floor"
      className="hidden h-11 items-center gap-1.5 rounded-md bg-white/10 px-3 text-[14px] font-semibold text-white hover:bg-white/20 sm:inline-flex"
    >
      <Icon name="grid" className="size-4" />
      {t("toFloor")}
    </Link>
  );
}

/** The kitchen screen: dark, full height, readable from across the kitchen on a tablet or a wall TV. */
export function KitchenShell({
  staff,
  extra,
  children,
}: {
  staff: Staff;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-night text-white">
      <TopBar
        staff={staff}
        dark
        extra={
          <>
            {staff.user.role !== "kitchen" && <BackToFloor />}
            {extra}
          </>
        }
      />
      <main>{children}</main>
    </div>
  );
}
