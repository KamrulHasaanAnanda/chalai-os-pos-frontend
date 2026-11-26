/** Seated time turns amber/red on the table card. */
export const TABLE_SEATED_WARN_MINUTES = 60;
export const TABLE_SEATED_CRITICAL_MINUTES = 120;

/** Show "Check order" when open longer than this (hours). */
export const TABLE_STALE_ORDER_HOURS = 6;

export const TABLE_STATUS_STRIP: Record<
  import("@/lib/api/types").TableStatus,
  string
> = {
  free: "bg-zinc-300",
  occupied: "bg-zinc-900",
  needs_approval: "bg-orange-500",
  food_ready: "bg-emerald-600",
  bill_requested: "bg-blue-600",
};

export type TableDensity = "compact" | "comfortable" | "large";
export type TableSort = "busy" | "label";

export const TABLE_DENSITY_KEY = "chalai_tables_density";
export const TABLE_SORT_KEY = "chalai_tables_sort";

export const DENSITY_MIN: Record<TableDensity, string> = {
  compact: "minmax(7.5rem, 1fr)",
  comfortable: "minmax(9.25rem, 1fr)",
  large: "minmax(10.5rem, 1fr)",
};

export const STATUS_SORT: Record<import("@/lib/api/types").TableStatus, number> = {
  needs_approval: 0,
  food_ready: 1,
  bill_requested: 2,
  occupied: 3,
  free: 4,
};