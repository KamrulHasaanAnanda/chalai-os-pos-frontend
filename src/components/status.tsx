import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/icons";
import { StatusPill, type Tone } from "@/components/app/status-pill";
import type { OrderStatus, RoundStatus, TableStatus } from "@/lib/api/types";

/** The five floor states (design system §3): colour + icon + word, never colour alone.
 *  White tiles; a busy table gets a thin coloured left edge and a coloured dot with its status word. */
export const tableStatusStyle: Record<TableStatus, { tile: string; dot: string; label: string; icon: IconName }> = {
  free: {
    tile: "border-border hover:border-zinc-400",
    dot: "bg-zinc-300",
    label: "text-muted-foreground",
    icon: "circle",
  },
  occupied: {
    tile: "border-border border-l-zinc-700 hover:border-zinc-400 hover:border-l-zinc-700",
    dot: "bg-zinc-700",
    label: "text-zinc-800",
    icon: "users",
  },
  needs_approval: {
    tile: "border-border border-l-orange-500 hover:border-zinc-400 hover:border-l-orange-500",
    dot: "bg-orange-500",
    label: "text-orange-700",
    icon: "bell",
  },
  food_ready: {
    tile: "border-border border-l-green-600 hover:border-zinc-400 hover:border-l-green-600",
    dot: "bg-green-600",
    label: "text-green-700",
    icon: "checkCircle",
  },
  bill_requested: {
    tile: "border-border border-l-blue-600 hover:border-zinc-400 hover:border-l-blue-600",
    dot: "bg-blue-600",
    label: "text-blue-700",
    icon: "receipt",
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
