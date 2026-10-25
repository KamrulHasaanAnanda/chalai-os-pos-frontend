import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const tones: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: "bg-[#f3ece0] text-[#574843]", dot: "bg-[#8a7a72]" },
  success: { pill: "bg-ok-soft text-ok", dot: "bg-ok" },
  warning: { pill: "bg-sun-tint text-[#7a5600]", dot: "bg-[#d79a00]" },
  danger: { pill: "bg-late/10 text-late", dot: "bg-late" },
  info: { pill: "bg-[#e8eefc] text-[#1e40af]", dot: "bg-[#2563eb]" },
  brand: { pill: "bg-maroon-tint text-maroon", dot: "bg-maroon" },
};

/** Small dot + label. The label always carries the meaning; the colour only reinforces it. */
export function StatusPill({
  tone = "neutral",
  children,
  pulse = false,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] leading-none font-semibold whitespace-nowrap",
        tones[tone].pill,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", tones[tone].dot, pulse && "animate-pulse")} />
      {children}
    </span>
  );
}
