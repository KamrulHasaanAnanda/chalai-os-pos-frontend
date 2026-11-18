// Soft pulse blocks that stand in for a page while the server answers. Same shapes as the owner app's
// (chalai-os-owner-app/src/components/page-skeleton.tsx), plus the POS page header with its icon tile.
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
      <Skeleton className="size-12 shrink-0 rounded-xl" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
      {action && <Skeleton className="hidden h-10 w-40 rounded-lg sm:block" />}
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
        <div key={i} className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-9 rounded-lg" />
          </div>
          <Skeleton className="mt-3 h-8 w-16" />
          <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
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
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-6 h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

/** A list or table of rows: orders, incoming QR orders, menu items. */
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
        <div key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
          <Skeleton className="size-9 shrink-0 rounded-md" />
          <div className="grid min-w-0 flex-1 gap-1.5">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-28 max-w-[70%]" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
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
        <Skeleton className="h-5 w-32" />
        <div className="mt-5 grid gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-6 h-px w-full" />
        <div className="mt-4 flex justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5 shadow-xs">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="mt-4 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-4 h-48 w-full rounded-lg" />
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
