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
        "inline-flex h-9 items-center gap-2 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap",
        dark ? "bg-white/10 text-white/85" : "border border-line bg-white text-[#574843]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2.5 rounded-full",
          status === "live" && "bg-[#22c55e] shadow-[0_0_0_3px_rgb(34_197_94/0.2)]",
          status === "offline" && "bg-late shadow-[0_0_0_3px_rgb(220_38_38/0.2)]",
          status === "connecting" && "animate-pulse bg-[#d79a00]",
        )}
      />
      <span className="max-sm:sr-only">{labels[status]}</span>
    </span>
  );
}
