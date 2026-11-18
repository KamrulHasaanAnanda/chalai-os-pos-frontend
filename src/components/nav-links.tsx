"use client";
// Client component: layouts don't re-render on navigation, so the current tab is read from the pathname here.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: IconName; tone?: string };

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "rail" | "bottom" }) {
  const path = usePathname();
  return (
    <ul className={cn("flex", variant === "rail" ? "flex-col" : "w-full")}>
      {items.map((item) => {
        const active = path === item.href || path.startsWith(`${item.href}/`);
        if (variant === "rail") {
          return (
            <li key={item.href} className="py-px">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-lg px-3 text-[14px] transition-colors [&>svg]:size-4 [&>svg]:shrink-0",
                  active
                    ? "bg-orange-500/[0.12] font-medium text-white [&>svg]:text-orange-400"
                    : "text-zinc-300 hover:bg-white/[0.06] hover:text-white [&>svg]:text-zinc-500 hover:[&>svg]:text-zinc-300",
                )}
              >
                <Icon name={item.icon} />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        }
        return (
          <li key={item.href} className="flex-1">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 text-[11.5px] font-medium transition-colors",
                active ? "font-semibold text-primary" : "text-muted-foreground",
              )}
            >
              <Icon name={item.icon} className="size-5" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
