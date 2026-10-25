import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/icons";
import { StatusPill, type Tone } from "@/components/ui/badge";
import type { OrderStatus, RoundStatus, TableStatus } from "@/lib/api/types";

/** The five floor states (design system §3): colour + icon + word, never colour alone. */
export const tableStatusStyle: Record<TableStatus, { tile: string; sub: string; icon: IconName; swatch: string }> = {
  free: {
    tile: "border border-[#e3d3b3] bg-white text-ink hover:border-[#cdb68a]",
    sub: "text-muted-foreground",
    icon: "circle",
    swatch: "border border-[#cdb68a] bg-white",
  },
  occupied: {
    tile: "border border-maroon/15 bg-maroon-tint text-maroon hover:border-maroon/35",
    sub: "text-maroon/75",
    icon: "users",
    swatch: "bg-maroon-tint border border-maroon/30",
  },
  needs_approval: {
    tile: "border border-[#e5b400] bg-sun text-ink shadow-[0_6px_18px_-8px_rgb(229_180_0/0.8)]",
    sub: "text-ink/75",
    icon: "bell",
    swatch: "bg-sun",
  },
  food_ready: {
    tile: "border border-ok bg-ok text-white shadow-[0_6px_18px_-8px_rgb(21_128_61/0.8)]",
    sub: "text-white/85",
    icon: "checkCircle",
    swatch: "bg-ok",
  },
  bill_requested: {
    tile: "border border-ink bg-ink text-sun shadow-[0_6px_18px_-8px_rgb(34_19_15/0.8)]",
    sub: "text-sun/80",
    icon: "receipt",
    swatch: "bg-ink",
  },
};

const roundTone: Record<RoundStatus, Tone> = {
  pending_approval: "warning",
  rejected: "danger",
  queued: "neutral",
  preparing: "info",
  ready: "success",
  served: "brand",
};

export function RoundPill({ status }: { status: RoundStatus }) {
  const t = useTranslations("roundStatus");
  return (
    <StatusPill tone={roundTone[status]} pulse={status === "pending_approval" || status === "ready"}>
      {t(status)}
    </StatusPill>
  );
}

const orderTone: Record<OrderStatus, Tone> = { open: "warning", paid: "success", cancelled: "danger" };

export function OrderPill({ status }: { status: OrderStatus }) {
  const t = useTranslations("orderStatus");
  return <StatusPill tone={orderTone[status]}>{t(status)}</StatusPill>;
}

export function TableStatusIcon({ status, className }: { status: TableStatus; className?: string }) {
  return <Icon name={tableStatusStyle[status].icon} className={className} />;
}
