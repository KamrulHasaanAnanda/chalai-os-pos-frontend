import { cn } from "@/lib/utils";

export type LiveLabels = { live: string; connecting: string; offline: string };
export type LiveState = keyof LiveLabels;

/** The connection dot in the top bar: green live, amber connecting, red offline (the word says it too). */
export function LiveStatus({ status, labels, dark = false }: { status: LiveState; labels: LiveLabels; dark?: boolean }) {
  return (
    <span
      role="status"
      title={labels[status]}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium whitespace-nowrap",
        dark ? "bg-white/10 text-white/85" : "border bg-card text-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          status === "live" && "bg-green-600",
          status === "offline" && "bg-late",
          status === "connecting" && "animate-pulse bg-[#d79a00]",
        )}
      />
      <span className="max-sm:sr-only">{labels[status]}</span>
    </span>
  );
}
