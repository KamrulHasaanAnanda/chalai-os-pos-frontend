/* eslint-disable @next/next/no-img-element -- the restaurant's logo (absolute API URL) and a small brand SVG */
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Suspense, type ReactNode } from "react";
import { ChalaiBotMount } from "@/components/chalai-bot";
import { Icon } from "@/components/icons";
import { LiveSync } from "@/components/live-sync";
import { LogoutButton } from "@/components/logout-button";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { Avatar } from "@/components/app/staff-avatar";
import { Toast } from "@/components/app/toast";
import type { Role } from "@/lib/api/types";
import type { Staff } from "@/lib/session";
import { cn } from "@/lib/utils";

export function useNavItems(role: Role): NavItem[] {
  const t = useTranslations("nav");
  const items: NavItem[] = [];
  if (role !== "kitchen") {
    items.push(
      { href: "/floor", label: t("floor"), icon: "grid" },
      { href: "/incoming", label: t("incoming"), icon: "bell" },
      { href: "/orders", label: t("orders"), icon: "list" },
    );
  }
  if (role === "owner" || role === "manager")
    items.push({ href: "/menu", label: t("menu"), icon: "book" });
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
  const { restaurant, user } = staff;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-16 border-b print:hidden",
        dark ? "border-white/10 bg-night text-white" : "border-line bg-card",
      )}
    >
      <div className="flex h-full items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {restaurant.logoUrl ? (
            <img
              src={restaurant.logoUrl}
              alt=""
              width={36}
              height={36}
              className="size-9 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <img
              src="/icon.svg"
              alt=""
              width={36}
              height={36}
              className="size-9 shrink-0"
            />
          )}
          <div className="min-w-0 leading-tight">
            <p
              className="truncate text-[15px] font-semibold"
              title={restaurant.name}
            >
              {restaurant.name}
            </p>
            <p
              className={cn(
                "truncate text-[12px] font-medium",
                dark ? "text-white/55" : "text-muted-foreground",
              )}
            >
              {t("product")}
            </p>
          </div>
        </div>
        {extra}
        <LiveSync
          dark={dark}
          labels={{
            live: t("live"),
            connecting: t("connecting"),
            offline: t("offline"),
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
  const t = useTranslations("common");
  const { restaurant } = staff;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {restaurant.logoUrl ? (
        <img
          src={restaurant.logoUrl}
          alt=""
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-md object-cover"
        />
      ) : (
        <img
          src="/icon.svg"
          alt=""
          width={32}
          height={32}
          className="size-8 shrink-0"
        />
      )}
      <div className="min-w-0 leading-tight">
        <p
          className="line-clamp-2 text-[14px] leading-snug font-semibold"
          title={restaurant.name}
        >
          {restaurant.name}
        </p>
        <p
          className={cn(
            "truncate text-[12px]",
            dark ? "text-zinc-400" : "text-muted-foreground",
          )}
        >
          {t("product")}
        </p>
      </div>
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
  const items = useNavItems(staff.user.role);
  const { user } = staff;

  return (
    <div className="min-h-dvh bg-background">
      <aside
        aria-label={t("mainNav")}
        className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col bg-zinc-900 text-zinc-100 md:flex print:hidden"
      >
        <div className="flex h-14 items-center border-b border-white/10 px-4">
          <RestaurantMark staff={staff} dark />
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <NavLinks items={items} variant="rail" />
        </nav>
        <div className="flex items-center gap-2.5 border-t border-white/10 p-3">
          <Avatar
            name={user.name}
            role={user.role}
            className="bg-white/10 text-white"
          />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium" title={user.name}>
              {user.name}
            </p>
            <p className="text-[12px] text-zinc-400">{tRoles(user.role)}</p>
          </div>
          <LogoutButton
            userId={user.id}
            className="flex size-9 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="logout" className="size-4" />
          </LogoutButton>
        </div>
      </aside>

      <div className="md:pl-56">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card px-4 sm:px-6 print:hidden">
          <div className="min-w-0 flex-1 md:hidden">
            <RestaurantMark staff={staff} />
          </div>
          <div className="hidden flex-1 md:block" />
          {extra}
          <LiveSync
            labels={{
              live: t("live"),
              connecting: t("connecting"),
              offline: t("offline"),
            }}
          />
          <LogoutButton
            userId={staff.user.id}
            formClassName="md:hidden"
            className="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Icon name="logout" className="size-5" />
          </LogoutButton>
        </header>
        <main className="px-4 pt-6 pb-28 sm:px-6 md:pb-10 lg:px-8">
          {children}
        </main>
      </div>

      <nav
        aria-label={t("mainNav")}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      >
        <NavLinks items={items} variant="bottom" />
      </nav>
      <Suspense>
        <Toast />
      </Suspense>
      <ChalaiBotMount name={staff.restaurant.name} />
    </div>
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
