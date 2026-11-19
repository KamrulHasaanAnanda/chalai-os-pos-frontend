// Soft pulse blocks that stand in for a page while the server answers. Same quiet shapes as the
// owner app (chalai-os-owner-app/src/components/page-skeleton.tsx), plus the POS page header.
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const bar = "bg-zinc-200/75";
const soft = "bg-zinc-100";

/** The page header: icon tile, title and one line, and a button on the right. */
export function PageHeaderSkeleton({
  action = true,
  className,
}: {
  action?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("mb-6 flex items-center gap-4 border-b pb-5", className)}
    >
      <Skeleton className={cn("size-12 shrink-0 rounded-xl", bar)} />
      <div className="grid flex-1 gap-2">
        <Skeleton className={cn("h-5 w-40", bar)} />
        <Skeleton className={cn("h-3.5 w-56 max-w-full", soft)} />
      </div>
      {action && (
        <Skeleton className={cn("hidden h-10 w-36 rounded-lg sm:block", bar)} />
      )}
    </div>
  );
}

/** A row of stat cards, like the floor's busy / open bills / seats / booked. */
export function StatsSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border bg-card px-4 py-4 shadow-xs">
          <Skeleton className={cn("h-3 w-20", soft)} />
          <Skeleton className={cn("mt-3 h-7 w-14", bar)} />
          <Skeleton className={cn("mt-3 h-1.5 w-full rounded-full", soft)} />
        </div>
      ))}
    </div>
  );
}

/** Tiles in a grid: tables on the floor, dishes in the menu. */
export function TileGridSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3",
        className,
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className={cn("size-9 rounded-lg", soft)} />
            <Skeleton className={cn("h-5 w-14 rounded-md", bar)} />
          </div>
          <Skeleton className={cn("mt-6 h-3.5 w-16", bar)} />
        </div>
      ))}
    </div>
  );
}

/** A list of rows: orders, incoming, menu items — name + meta, trailing value. */
export function ListSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "divide-y overflow-hidden rounded-xl border bg-card shadow-xs",
        className,
      )}
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
          <div className="grid min-w-0 flex-1 gap-1.5">
            <Skeleton
              className={cn(
                "h-3.5 max-w-full",
                bar,
                i % 3 === 0 ? "w-44" : i % 3 === 1 ? "w-36" : "w-52",
              )}
            />
            <Skeleton
              className={cn(
                "h-3 max-w-[70%]",
                soft,
                i % 2 === 0 ? "w-28" : "w-24",
              )}
            />
          </div>
          <Skeleton className={cn("h-3.5 w-14 shrink-0", bar)} />
        </div>
      ))}
    </div>
  );
}

/** An order: the dishes on the left, the totals / payment panel on the right. */
export function OrderSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="rounded-xl border bg-card p-5 shadow-xs">
        <Skeleton className={cn("h-4 w-28", bar)} />
        <div className="mt-5 grid gap-3.5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className={cn("h-3.5 w-6", soft)} />
              <Skeleton className={cn("h-3.5 flex-1", bar)} />
              <Skeleton className={cn("h-3.5 w-14", bar)} />
            </div>
          ))}
        </div>
        <div className="mt-6 border-t pt-4 flex justify-between">
          <Skeleton className={cn("h-4 w-16", soft)} />
          <Skeleton className={cn("h-4 w-20", bar)} />
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5 shadow-xs">
        <Skeleton className={cn("h-20 w-full rounded-lg", soft)} />
        <div className="mt-4 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className={cn("h-12 rounded-lg", bar)} />
          ))}
        </div>
        <Skeleton className={cn("mt-4 h-40 w-full rounded-lg", soft)} />
      </div>
    </div>
  );
}

/** Screen-reader text and the wrapper every loading page uses. */
export function LoadingPage({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      {children}
    </div>
  );
}
