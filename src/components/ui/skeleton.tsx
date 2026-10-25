import { cn } from "@/lib/utils";

/** Shimmering placeholder block for loading.tsx files. */
export function Skeleton({ className, dark = false }: { className?: string; dark?: boolean }) {
  return <div aria-hidden className={cn("skeleton rounded-xl", dark && "skeleton-dark", className)} />;
}
