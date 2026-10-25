import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Data table: sticky header, row hover, right-aligned numbers. Under 640 px each row becomes a stacked card
 * (labels come from each cell's data-label; see .rtable in globals.css).
 */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(34_19_15/0.04),0_8px_24px_-16px_rgb(80_30_10/0.18)] max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none">
      <table className={cn("rtable w-full border-collapse text-left text-[15px]", className)} {...props} />
    </div>
  );
}

export function Th({ className, numeric, ...props }: ComponentProps<"th"> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "sticky top-0 border-b border-line bg-[#fbf7ef] px-4 py-3 text-[12px] font-semibold tracking-wide text-[#6c5d57] uppercase",
        numeric && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, numeric, label, ...props }: ComponentProps<"td"> & { numeric?: boolean; label: string }) {
  return <td data-label={label} className={cn("border-b border-line px-4 py-3", numeric && "text-right tabular-nums", className)} {...props} />;
}
