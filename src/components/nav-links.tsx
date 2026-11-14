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
    <ul className={cn("flex", variant === "rail" ? "flex-col gap-0.5" : "w-full")}>
      {items.map((item) => {
        const active = path === item.href || path.startsWith(`${item.href}/`);
        return (
          <li key={item.href} className={variant === "bottom" ? "flex-1" : undefined}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center transition-colors",
                variant === "rail"
                  ? "h-10 gap-2.5 rounded-md px-3 text-[14px]"
                  : "h-16 flex-col justify-center gap-1 text-[11.5px] font-medium",
                variant === "rail" && (active ? "bg-white/10 font-medium text-white shadow-[inset_2px_0_0_var(--sun)]" : "text-zinc-400 hover:bg-white/5 hover:text-white"),
                variant === "bottom" && (active ? "font-semibold text-primary" : "text-muted-foreground"),
              )}
            >
              <Icon name={item.icon} className={variant === "rail" ? "size-[18px]" : "size-5"} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
