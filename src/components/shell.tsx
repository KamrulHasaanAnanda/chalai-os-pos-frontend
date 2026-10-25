/* eslint-disable @next/next/no-img-element -- the restaurant's logo (absolute API URL) and a small brand SVG */
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Suspense, type ReactNode } from "react";
import { logout } from "@/actions/auth";
import { Icon } from "@/components/icons";
import { LiveSync } from "@/components/live-sync";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { Avatar } from "@/components/ui/avatar";
import { Toast } from "@/components/ui/toast";
import type { Role } from "@/lib/api/types";
import type { Staff } from "@/lib/session";
import { cn } from "@/lib/utils";

export function useNavItems(role: Role): NavItem[] {
  const t = useTranslations("nav");
  const items: NavItem[] = [];
  if (role !== "kitchen") {
    items.push({ href: "/floor", label: t("floor"), icon: "grid" }, { href: "/orders", label: t("orders"), icon: "list" });
  }
  if (role === "owner" || role === "manager") items.push({ href: "/menu", label: t("menu"), icon: "book" });
  if (role === "owner" || role === "manager" || role === "kitchen") items.push({ href: "/kitchen", label: t("kitchen"), icon: "chef" });
  return items;
}

/** Top bar: logo + restaurant, live connection dot, user + role, logout. `dark` is the kitchen screen. */
export function TopBar({ staff, dark = false, extra }: { staff: Staff; dark?: boolean; extra?: ReactNode }) {
  const t = useTranslations("common");
  const tRoles = useTranslations("roles");
  const { restaurant, user } = staff;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-16 border-b print:hidden",
        dark ? "border-white/10 bg-night text-white" : "border-line bg-white/90 backdrop-blur-md",
      )}
    >
      <div className="flex h-full items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {restaurant.logoUrl ? (
            <img src={restaurant.logoUrl} alt="" width={36} height={36} className="size-9 shrink-0 rounded-lg object-cover" />
          ) : (
            <img src="/icon.svg" alt="" width={36} height={36} className="size-9 shrink-0" />
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-bold" title={restaurant.name}>
              {restaurant.name}
            </p>
            <p className={cn("truncate text-[12px] font-medium", dark ? "text-white/55" : "text-muted-foreground")}>{t("product")}</p>
          </div>
        </div>
        {extra}
        <LiveSync dark={dark} labels={{ live: t("live"), connecting: t("connecting"), offline: t("offline") }} />
        <div className="hidden items-center gap-2.5 sm:flex">
          <Avatar name={user.name} className={dark ? "bg-white/10 text-white" : undefined} />
          <div className="leading-tight">
            <p className="max-w-[140px] truncate text-[14px] font-semibold" title={user.name}>
              {user.name}
            </p>
            <p className={cn("text-[12px]", dark ? "text-white/55" : "text-muted-foreground")}>{tRoles(user.role)}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            aria-label={t("logout")}
            title={t("logout")}
            className={cn(
              "flex size-12 items-center justify-center rounded-xl transition-colors duration-150",
              dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-[#6c5d57] hover:bg-[#f6eedb] hover:text-ink",
            )}
          >
            <Icon name="logout" />
          </button>
        </form>
      </div>
    </header>
  );
}

/** POS shell: top bar + left rail on tablet/desktop, bottom bar on phones. `extra` goes into the top bar. */
export function PosShell({ staff, extra, children }: { staff: Staff; extra?: ReactNode; children: ReactNode }) {
  const t = useTranslations("common");
  const tRoles = useTranslations("roles");
  const items = useNavItems(staff.user.role);

  return (
    <div className="min-h-dvh bg-[#faf6ee]">
      <TopBar staff={staff} extra={extra} />
      <nav
        aria-label={t("mainNav")}
        className="fixed top-16 bottom-0 left-0 z-30 hidden w-[88px] flex-col border-r border-line bg-white px-2 py-3 md:flex print:hidden"
      >
        <NavLinks items={items} variant="rail" />
        <p className="mt-auto text-center text-[11px] leading-tight text-muted-foreground">
          {staff.user.name.split(" ")[0]}
          <br />
          {tRoles(staff.user.role)}
        </p>
      </nav>
      <main className="px-4 pt-5 pb-28 sm:px-6 md:pb-10 md:pl-[112px] lg:pr-8">{children}</main>
      <nav
        aria-label={t("mainNav")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden print:hidden"
      >
        <NavLinks items={items} variant="bottom" />
      </nav>
      <Suspense>
        <Toast />
      </Suspense>
    </div>
  );
}

/** For managers on the kitchen screen: one quiet link back to the floor. */
export function BackToFloor() {
  const t = useTranslations("kitchen");
  return (
    <Link
      href="/floor"
      className="hidden h-11 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-[14px] font-semibold text-white hover:bg-white/20 sm:inline-flex"
    >
      <Icon name="grid" className="size-4" />
      {t("toFloor")}
    </Link>
  );
}

/** The kitchen screen: dark, full height, readable from across the kitchen on a tablet or a wall TV. */
export function KitchenShell({ staff, extra, children }: { staff: Staff; extra?: ReactNode; children: ReactNode }) {
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
