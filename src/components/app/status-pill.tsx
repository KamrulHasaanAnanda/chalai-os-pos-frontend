import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const tones: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: "", dot: "bg-muted-foreground" },
  success: { pill: "border-ok/25 bg-ok-soft text-ok", dot: "bg-ok" },
  warning: { pill: "border-sun/30 bg-sun-tint text-brand", dot: "bg-sun" },
  danger: { pill: "border-destructive/25 bg-destructive/5 text-destructive", dot: "bg-destructive" },
  info: { pill: "border-[#c7d2fe] bg-[#eef2ff] text-[#3730a3]", dot: "bg-[#4f46e5]" },
  brand: { pill: "border-primary/20 bg-primary/5 text-primary", dot: "bg-primary" },
};

/** shadcn Badge with a dot. The label always carries the meaning; the colour only reinforces it. */
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
    <Badge variant="outline" className={cn("gap-1.5", tones[tone].pill, className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", tones[tone].dot, pulse && "animate-pulse")} />
      {children}
    </Badge>
  );
}
