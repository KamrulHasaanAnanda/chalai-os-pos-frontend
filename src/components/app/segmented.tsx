import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Segmented control made of links (areas, filters, tabs). Works without JavaScript. */
export function Segmented({
  label,
  items,
  className,
}: {
  label: string;
  items: { href: string; label: ReactNode; active: boolean; count?: number }[];
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn("max-w-full overflow-x-auto", className)}
    >
      <ul className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              scroll={false}
              className={cn(
                // Looks like a shadcn TabsTrigger, but each tab is a link so it works without JavaScript.
                "flex h-10 items-center gap-2 rounded-md px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                item.active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[12px] tabular-nums",
                    item.active
                      ? "text-muted-foreground"
                      : "text-muted-foreground/70",
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
