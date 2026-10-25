import { useTranslations } from "next-intl";
import type { Order } from "@/lib/api/types";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Subtotal → discount → VAT → total → paid → due, exactly as the API computed them. */
export function OrderTotals({ order, large = false }: { order: Order; large?: boolean }) {
  const t = useTranslations("totals");
  const row = "flex items-baseline justify-between gap-3 py-1";
  return (
    <dl className={cn("text-[16px]", large && "text-[17px]")}>
      <div className={row}>
        <dt>{t("subtotal")}</dt>
        <dd className="font-semibold tabular-nums">{formatTaka(order.subtotalTaka)}</dd>
      </div>
      {order.discountTaka > 0 && (
        <div className={row}>
          <dt>
            {t("discount")}
            {order.discountReason && <span className="ml-1 text-muted-foreground">({order.discountReason})</span>}
          </dt>
          <dd className="font-semibold text-ok tabular-nums">−{formatTaka(order.discountTaka)}</dd>
        </div>
      )}
      <div className={row}>
        <dt>{t("vat", { percent: order.vatPercent })}</dt>
        <dd className="font-semibold tabular-nums">{formatTaka(order.vatTaka)}</dd>
      </div>
      <div className={cn(row, "mt-1 border-t-2 border-line pt-2")}>
        <dt className="font-extrabold">{t("total")}</dt>
        <dd className={cn("font-extrabold tabular-nums", large ? "text-[28px]" : "text-[22px]")}>{formatTaka(order.totalTaka)}</dd>
      </div>
      {order.paidTaka > 0 && (
        <div className={row}>
          <dt>{t("paid")}</dt>
          <dd className="font-semibold tabular-nums">{formatTaka(order.paidTaka)}</dd>
        </div>
      )}
      {order.status === "open" && (
        <div className={row}>
          <dt className="font-bold">{t("due")}</dt>
          <dd className={cn("font-extrabold tabular-nums", order.dueTaka > 0 ? "text-late" : "text-ok")}>{formatTaka(order.dueTaka)}</dd>
        </div>
      )}
    </dl>
  );
}
