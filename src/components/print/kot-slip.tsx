import { useTranslations } from "next-intl";
import type { Kot, ReceiptWidth } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * One kitchen order ticket: table or token, round, time, who sent it, each dish with quantity and its note (variant
 * and add-ons are already in the kitchen line). No prices. Big type: it is read across a hot kitchen.
 */
export function KotSlip({
  kot,
  width,
  timeZone,
  reprint,
  fallback,
}: {
  kot: Kot;
  width: ReceiptWidth;
  timeZone: string;
  reprint: boolean;
  /** Printed by the POS because the kitchen screen was silent. */
  fallback: boolean;
}) {
  const t = useTranslations("kot");
  const tOrder = useTranslations("order");
  const narrow = width === 58;
  return (
    <article
      className={cn(
        "mx-auto max-w-full bg-white font-mono leading-[1.35] text-black shadow print:shadow-none",
        narrow ? "px-[2mm] py-[3mm] text-[12px]" : "px-[4mm] py-[4mm] text-[14px]",
      )}
      style={{ width: `${width}mm` }}
    >
      <header className="text-center">
        <p className="text-[11px] tracking-widest">{t("heading")}</p>
        <p className={cn("font-bold", narrow ? "text-[22px]" : "text-[28px]")}>
          {kot.tableLabel ? tOrder("table", { table: kot.tableLabel }) : tOrder("takeaway")}
        </p>
        {kot.areaName && <p>{kot.areaName}</p>}
        <p className="font-semibold">
          {t("order", { number: kot.orderNumber })} · {t("round", { n: kot.roundNumber })}
        </p>
        <p>{formatDateTime(kot.sentAt, timeZone)}</p>
        <p>{kot.source === "qr" ? (kot.sentBy ? `${t("fromQr")} · ${kot.sentBy}` : t("fromQr")) : t("sentBy", { name: kot.sentBy ?? "" })}</p>
        {reprint && <p className="mt-1 font-bold">{t("reprint")}</p>}
      </header>
      <hr className="my-2 border-dashed border-black" />
      <ul className="space-y-1.5">
        {kot.items.map((item, i) => (
          <li key={i}>
            <p className={cn("flex gap-2 font-bold", narrow ? "text-[15px]" : "text-[18px]")}>
              <span className="shrink-0">{item.quantity} ×</span>
              <span>{item.name}</span>
            </p>
            {item.note && <p className="pl-6 whitespace-pre-line">{item.note}</p>}
          </li>
        ))}
      </ul>
      {kot.note && (
        <>
          <hr className="my-2 border-dashed border-black" />
          <p className="font-semibold">{t("note", { note: kot.note })}</p>
        </>
      )}
      {fallback && <p className="mt-2 text-center text-[10px]">{t("fallback")}</p>}
    </article>
  );
}
