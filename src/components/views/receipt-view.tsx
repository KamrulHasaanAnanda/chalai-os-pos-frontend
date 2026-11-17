import Link from "next/link";
import { useTranslations } from "next-intl";
import { PrintButton } from "@/components/print-button";
import { buttonVariants } from "@/components/ui/button";
import type { Receipt } from "@/lib/api/types";
import { formatDateTime, formatTaka } from "@/lib/format";
import { orderHref } from "@/lib/paths";
import { cn } from "@/lib/utils";

/** Same dish at the same price on one line, as the bill shows it. */
function mergedLines(receipt: Receipt) {
  const lines = new Map<string, { key: string; name: string; quantity: number; unitPriceTaka: number; totalTaka: number }>();
  for (const item of receipt.items) {
    const key = `${item.name}:${item.unitPriceTaka}`;
    const line = lines.get(key) ?? { key, name: item.name, quantity: 0, unitPriceTaka: item.unitPriceTaka, totalTaka: 0 };
    line.quantity += item.quantity;
    line.totalTaka += item.lineTotalTaka;
    lines.set(key, line);
  }
  return [...lines.values()];
}

/**
 * A thermal-printer receipt, 58 or 80 mm wide (restaurant setting). On screen it shows centred with Print / Back
 * buttons; on paper only the slip. BIN and the Mushak layout come with the VAT-records spec.
 */
export function ReceiptView({ receipt, timeZone: tz }: { receipt: Receipt; timeZone: string }) {
  const t = useTranslations("receipt");
  const tMethod = useTranslations("paymentMethod");
  const tOrder = useTranslations("order");
  const width = `${receipt.receiptWidthMm}mm`;
  const narrow = receipt.receiptWidthMm === 58;
  const row = "flex justify-between gap-2";
  const change = receipt.payments.reduce((sum, p) => sum + p.changeTaka, 0);

  return (
    <div className="min-h-dvh bg-gray py-6 print:bg-white print:py-0">
      <style>{`@page { size: ${width} auto; margin: 0; } @media print { html, body { background: #fff !important; } }`}</style>
      <div className="mx-auto mb-4 flex max-w-full gap-2 px-2 print:hidden" style={{ width }}>
        <PrintButton className={cn(buttonVariants({ variant: "default" }), "flex-1")}>{t("print")}</PrintButton>
        <Link href={orderHref(receipt.orderId)} className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>
          {t("back")}
        </Link>
      </div>

      <article
        className={cn(
          "mx-auto max-w-full bg-white font-mono leading-[1.45] text-black shadow print:shadow-none",
          narrow ? "px-[2mm] py-[4mm] text-[10.5px]" : "px-[4mm] py-[5mm] text-[12px]",
        )}
        style={{ width }}
      >
        <header className="text-center">
          <p className={cn("font-semibold", narrow ? "text-[14px]" : "text-[16px]")}>{receipt.restaurantName}</p>
          {receipt.branchName && <p>{receipt.branchName}</p>}
          {receipt.branchAddress && <p>{receipt.branchAddress}</p>}
          <p className="mt-1">{formatDateTime(receipt.closedAt ?? receipt.openedAt, tz)}</p>
          <p>
            {t("order", { number: receipt.billNumber })} · {receipt.tableLabel ? tOrder("table", { table: receipt.tableLabel }) : receipt.tokenNo ? tOrder("pickup", { token: receipt.tokenNo }) : tOrder("takeaway")}
          </p>
          {receipt.guestName && <p>{receipt.guestName}</p>}
          {receipt.status !== "paid" && <p className="mt-1 font-semibold">{receipt.status === "open" ? t("unpaid") : t("cancelled")}</p>}
        </header>

        <hr className="my-2 border-dashed border-black" />
        <ul>
          {mergedLines(receipt).map((line) => (
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
          <span>{formatTaka(receipt.subtotalTaka)}</span>
        </p>
        {receipt.discountTaka > 0 && (
          <p className={row}>
            <span>{t("discount")}</span>
            <span>−{formatTaka(receipt.discountTaka)}</span>
          </p>
        )}
        {receipt.serviceChargeTaka > 0 && (
          <p className={row}>
            <span>{t("serviceCharge", { percent: receipt.serviceChargePercent })}</span>
            <span>{formatTaka(receipt.serviceChargeTaka)}</span>
          </p>
        )}
        <p className={row}>
          <span>{t(receipt.vatMode === "inclusive" ? "vatIncluded" : "vat", { percent: receipt.vatPercent })}</span>
          <span>{formatTaka(receipt.vatTaka)}</span>
        </p>
        {receipt.roundingTaka !== 0 && (
          <p className={row}>
            <span>{t("rounding")}</span>
            <span>
              {receipt.roundingTaka < 0 ? "−" : ""}
              {formatTaka(Math.abs(receipt.roundingTaka))}
            </span>
          </p>
        )}
        <p className={cn(row, "mt-1 font-semibold", narrow ? "text-[13px]" : "text-[15px]")}>
          <span>{t("total")}</span>
          <span>{formatTaka(receipt.totalTaka)}</span>
        </p>

        {receipt.payments.length > 0 && (
          <>
            <hr className="my-2 border-dashed border-black" />
            {receipt.payments.map((p, i) => (
              <p key={i} className={row}>
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
            {receipt.dueTaka > 0 && (
              <p className={cn(row, "font-semibold")}>
                <span>{t("due")}</span>
                <span>{formatTaka(receipt.dueTaka)}</span>
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
