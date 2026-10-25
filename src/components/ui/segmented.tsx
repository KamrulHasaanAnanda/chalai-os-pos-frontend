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
    <nav aria-label={label} className={cn("max-w-full overflow-x-auto", className)}>
      <ul className="inline-flex gap-1 rounded-xl bg-[#f3ece0] p-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              scroll={false}
              className={cn(
                "flex h-11 items-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold whitespace-nowrap transition-colors duration-150",
                item.active ? "bg-white text-ink shadow-[0_1px_2px_rgb(34_19_15/0.12)]" : "text-[#6c5d57] hover:text-ink",
              )}
            >
              {item.label}
              {item.count !== undefined && (
                <span className={cn("rounded-full px-1.5 text-[12px] tabular-nums", item.active ? "bg-maroon-tint text-maroon" : "bg-white/70")}>
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
