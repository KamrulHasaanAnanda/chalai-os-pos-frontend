"use client";
// Client component: layouts don't re-render on navigation, so the current tab is read from the pathname here.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: IconName };

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "rail" | "bottom" }) {
  const path = usePathname();
  return (
    <ul className={cn("flex", variant === "rail" ? "flex-col gap-1" : "w-full")}>
      {items.map((item) => {
        const active = path === item.href || path.startsWith(`${item.href}/`);
        return (
          <li key={item.href} className={variant === "bottom" ? "flex-1" : undefined}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex flex-col items-center justify-center gap-1 font-semibold transition-colors duration-150",
                variant === "rail" ? "h-[68px] rounded-xl text-[12px]" : "h-16 text-[11.5px]",
                active ? "text-maroon" : "text-[#7a6b64] hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150",
                  active ? "bg-maroon-tint" : "group-hover:bg-[#f6eedb]",
                )}
              >
                <Icon name={item.icon} className="size-5" />
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
