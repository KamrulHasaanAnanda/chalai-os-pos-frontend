import type { ComponentProps } from "react";
import { Table as ShadcnTable, TableCell, TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * shadcn Table in a bordered card. Rows get shadcn's hover and dividers; under 640 px each row becomes a
 * stacked card (labels come from each cell's data-label; see .rtable in globals.css).
 */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-hidden rounded-md border bg-card max-sm:border-0 max-sm:bg-transparent">
      <ShadcnTable
        className={cn(
          "rtable text-[15px] [&_tbody_tr]:border-b [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/50 [&_tbody_tr:last-child]:border-0 [&_thead_tr]:border-b",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function Th({ className, numeric, ...props }: ComponentProps<"th"> & { numeric?: boolean }) {
  return <TableHead scope="col" className={cn("h-11 bg-muted/50 px-4 text-muted-foreground", numeric && "text-right", className)} {...props} />;
}

export function Td({ className, numeric, label, ...props }: ComponentProps<"td"> & { numeric?: boolean; label: string }) {
  return <TableCell data-label={label} className={cn("px-4 py-3 whitespace-normal", numeric && "text-right tabular-nums", className)} {...props} />;
}
