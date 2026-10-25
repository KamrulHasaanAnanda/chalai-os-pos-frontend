import Link from "next/link";
import { useTranslations } from "next-intl";
import { PrintButton } from "@/components/print-button";
import { buttonClass } from "@/components/ui/button";
import type { Order, Restaurant } from "@/lib/api/types";
import { formatDateTime, formatTaka } from "@/lib/format";
import { billLines } from "@/lib/order";
import { orderHref } from "@/lib/paths";
import { cn } from "@/lib/utils";

/** An 80 mm thermal-printer receipt. On screen it shows centred with Print / Back buttons; on paper only the slip. */
export function ReceiptView({ order, restaurant }: { order: Order; restaurant: Restaurant }) {
  const t = useTranslations("receipt");
  const tMethod = useTranslations("paymentMethod");
  const tOrder = useTranslations("order");
  const tz = restaurant.timezone;
  const lines = billLines(order);
  const row = "flex justify-between gap-2";
  const change = order.payments.reduce((sum, p) => sum + (p.tenderedTaka ? p.tenderedTaka - p.amountTaka : 0), 0);

  return (
    <div className="min-h-dvh bg-gray py-6 print:bg-white print:py-0">
      <style>{`@page { size: 80mm auto; margin: 0; } @media print { html, body { background: #fff !important; } }`}</style>
      <div className="mx-auto mb-4 flex w-[80mm] max-w-full gap-2 px-2 print:hidden">
        <PrintButton className={cn(buttonClass({ variant: "accent" }), "flex-1")}>{t("print")}</PrintButton>
        <Link href={orderHref(order.id)} className={cn(buttonClass({ variant: "secondary" }), "flex-1")}>
          {t("back")}
        </Link>
      </div>

      <article className="mx-auto w-[80mm] max-w-full bg-white px-[4mm] py-[5mm] font-mono text-[12px] leading-[1.45] text-black shadow print:shadow-none">
        <header className="text-center">
          <p className="text-[16px] font-bold">{restaurant.name}</p>
          {restaurant.area && <p>{restaurant.area}</p>}
          <p className="mt-1">{formatDateTime(order.closedAt ?? order.openedAt, tz)}</p>
          <p>
            {t("order", { number: order.number })} · {order.tableLabel ? tOrder("table", { table: order.tableLabel }) : tOrder("takeaway")}
          </p>
          {order.guestName && <p>{order.guestName}</p>}
          {order.status !== "paid" && <p className="mt-1 font-bold">{order.status === "open" ? t("unpaid") : t("cancelled")}</p>}
        </header>

        <hr className="my-2 border-dashed border-black" />
        <ul>
          {lines.map((line) => (
            <li key={line.key}>
              <p>{line.name}</p>
              <p className={row}>
                <span>
                  {line.quantity} × {formatTaka(line.unitPriceTaka)}
                </span>
                <span>{formatTaka(line.totalTaka)}</span>
              </p>
            </li>
          ))}
        </ul>
        <hr className="my-2 border-dashed border-black" />

        <p className={row}>
          <span>{t("subtotal")}</span>
          <span>{formatTaka(order.subtotalTaka)}</span>
        </p>
        {order.discountTaka > 0 && (
          <p className={row}>
            <span>{t("discount")}</span>
            <span>−{formatTaka(order.discountTaka)}</span>
          </p>
        )}
        <p className={row}>
          <span>{t("vat", { percent: order.vatPercent })}</span>
          <span>{formatTaka(order.vatTaka)}</span>
        </p>
        <p className={cn(row, "mt-1 text-[15px] font-bold")}>
          <span>{t("total")}</span>
          <span>{formatTaka(order.totalTaka)}</span>
        </p>

        {order.payments.length > 0 && (
          <>
            <hr className="my-2 border-dashed border-black" />
            {order.payments.map((p) => (
              <p key={p.id} className={row}>
                <span>
                  {tMethod(p.method)}
                  {p.reference ? ` ${p.reference}` : ""}
                </span>
                <span>{formatTaka(p.tenderedTaka ?? p.amountTaka)}</span>
              </p>
            ))}
            {change > 0 && (
              <p className={row}>
                <span>{t("change")}</span>
                <span>{formatTaka(change)}</span>
              </p>
            )}
            {order.dueTaka > 0 && (
              <p className={cn(row, "font-bold")}>
                <span>{t("due")}</span>
                <span>{formatTaka(order.dueTaka)}</span>
              </p>
            )}
          </>
        )}

        <hr className="my-2 border-dashed border-black" />
        <p className="text-center">{t("thanks")}</p>
        <p className="text-center text-[10px]">{t("poweredBy")}</p>
      </article>
    </div>
  );
}
