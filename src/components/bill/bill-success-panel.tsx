"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/icons";
import type { Order } from "@/lib/api/types";
import { formatTaka } from "@/lib/format";
import { orderHref } from "@/lib/paths";

export function BillSuccessPanel({
  order,
  changeTaka,
}: {
  order: Order;
  changeTaka: number;
}) {
  const t = useTranslations("bill");
  const lastCash = [...order.payments].reverse().find((p) => p.method === "cash");
  const paid = lastCash?.amountTaka ?? order.payments[order.payments.length - 1]?.amountTaka ?? order.totalTaka;
  const phone = order.guestPhone ?? order.customer?.phone;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span
        aria-hidden
        className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
      >
        <Icon name="checkCircle" className="size-9" />
      </span>
      <div>
        <p className="text-[22px] font-bold tracking-tight">{t("paidSuccessTitle")}</p>
        <p className="mt-1 text-[15px] font-semibold tabular-nums text-muted-foreground">
          {t("paidSuccessDetail", {
            paid: formatTaka(paid),
            change: formatTaka(changeTaka),
          })}
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-2">
        <Link
          href={orderHref(order.id, "receipt")}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground"
        >
          <Icon name="printer" className="size-5" />
          {t("printReceipt")}
        </Link>
        {phone ? (
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-[14px] font-semibold"
            disabled
            title={t("smsComingSoon")}
          >
            {t("sendSmsReceipt")}
          </button>
        ) : null}
        <Link
          href="/floor"
          className="inline-flex h-11 items-center justify-center rounded-xl border text-[14px] font-semibold hover:bg-zinc-50"
        >
          {t("backToFloor")}
        </Link>
        <Link
          href="/tables"
          className="inline-flex h-11 items-center justify-center text-[13.5px] font-semibold text-primary"
        >
          {t("newOrder")}
        </Link>
      </div>
    </div>
  );
}