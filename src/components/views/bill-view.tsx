import Link from "next/link";
import { useTranslations } from "next-intl";
import { BillAdjustmentsBar } from "@/components/bill/bill-adjustments-bar";
import { BillCustomerRow } from "@/components/bill/bill-customer-row";
import { BillHeaderMenu } from "@/components/bill/bill-header-menu";
import { BillSuccessPanel } from "@/components/bill/bill-success-panel";
import { Icon } from "@/components/icons";
import { OrderTotals } from "@/components/order-totals";
import { Notice } from "@/components/app/field";
import { PAY_FORM_ID, PaymentForm } from "@/components/payment-form";
import type { Order, User } from "@/lib/api/types";
import { billDetailLines } from "@/lib/bill-display";
import type { ErrorReader } from "@/lib/error-reader";
import { formatTaka, formatTime } from "@/lib/format";
import { orderHref } from "@/lib/paths";
import { cn } from "@/lib/utils";

const panel =
  "flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm";

export function BillView({
  order,
  user,
  timeZone: tz,
  creditEnabled = false,
  error,
  changeTaka = 0,
}: {
  order: Order;
  user: User;
  timeZone: string;
  creditEnabled?: boolean;
  error: ErrorReader;
  /** Last cash payment change (success UI). */
  changeTaka?: number;
}) {
  const t = useTranslations("bill");
  const tOrder = useTranslations("order");
  const open = order.status === "open";
  const paid = order.status === "paid";
  const pendingRounds = order.rounds.filter((r) => r.status === "pending_approval").length;
  const lines = billDetailLines(order);
  const waiter = order.rounds.find((r) => r.createdBy)?.createdBy?.name ?? user.name;
  const payable = open && order.dueTaka > 0;
  const canGiveCredit =
    creditEnabled &&
    (user.role === "owner" || user.role === "manager" || Boolean(user.permissions?.credit));
  const tableTitle = order.tableLabel
    ? tOrder("table", { table: order.tableLabel })
    : order.tokenNo
      ? tOrder("pickup", { token: order.tokenNo })
      : tOrder("takeaway");

  const metaParts = [
    order.areaName,
    tOrder("number", { number: order.number }),
    t("openedAt", { time: formatTime(order.openedAt, tz) }),
    waiter ? t("servedByMeta", { name: waiter }) : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1500px] flex-col gap-4 px-3 py-3 sm:px-4 lg:min-h-[calc(100dvh-7.5rem)] lg:flex-row lg:gap-4">
      <section aria-labelledby="bill-items" className={cn(panel, "lg:w-[45%] lg:flex-1")}>
        <header className="shrink-0 border-b px-4 pt-3 pb-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Link
              href={orderHref(order.id)}
              className="-ml-1 inline-flex min-h-10 items-center gap-0.5 rounded-md px-1.5 text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500/25"
            >
              <Icon name="back" className="size-4" />
              {t("backToOrder")}
            </Link>
            <BillHeaderMenu orderId={order.id} />
          </div>
          <h1 id="bill-items" className="mt-2 text-[22px] font-bold tracking-tight sm:text-[24px]">
            {t("heading", { table: tableTitle })}
          </h1>
          <p className="mt-1 max-w-full text-[13px] leading-snug font-medium text-pretty text-muted-foreground">
            {metaParts.join(" · ")}
          </p>
        </header>

        {payable ? <BillCustomerRow order={order} payable /> : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {error.general ? <Notice className="mb-3">{error.general}</Notice> : null}
          {!open && !paid ? (
            <Notice className="mb-3" tone="error">
              {t("cancelledOrder")}
            </Notice>
          ) : null}
          {open && pendingRounds > 0 ? (
            <Notice className="mb-3" tone="info">
              {t("pendingRounds")}{" "}
              <Link href={orderHref(order.id)} className="font-semibold underline">
                {t("goApprove")}
              </Link>
            </Notice>
          ) : null}

          {lines.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-muted-foreground">{t("noItems")}</p>
          ) : (
            <table className="w-full text-[14px]">
              <thead className="sticky top-0 z-[1] bg-card">
                <tr className="border-b-2 border-select text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                  <th scope="col" className="w-10 py-2 text-left">
                    {t("colQty")}
                  </th>
                  <th scope="col" className="py-2 text-left">
                    {t("colItem")}
                  </th>
                  <th scope="col" className="w-24 py-2 text-right">
                    {t("amountCol")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-zinc-200">
                {lines.map((line) => (
                  <tr key={line.key}>
                    <td className="py-2.5 align-top font-bold tabular-nums">{line.quantity}</td>
                    <td className="py-2.5 pr-2 align-top">
                      <span className="block font-semibold">
                        {line.variant ? `${line.title} – ${line.variant}` : line.title}
                      </span>
                      {line.quantity > 1 ? (
                        <span className="text-[12.5px] text-muted-foreground tabular-nums">
                          {t("lineUnitQty", {
                            price: formatTaka(line.unitPriceTaka),
                            qty: line.quantity,
                          })}
                        </span>
                      ) : null}
                      {line.note ? (
                        <span className="mt-0.5 block pl-3 text-[12.5px] text-muted-foreground before:content-['–_']">
                          {line.note}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 text-right align-top font-bold tabular-nums">
                      {formatTaka(line.totalTaka)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {open && lines.length > 0 ? (
          <BillAdjustmentsBar order={order} user={user} error={error} />
        ) : null}

        <footer className="shrink-0 border-t bg-zinc-50 px-4 py-3 sm:px-5">
          <OrderTotals order={order} compact billSummary />
        </footer>
      </section>

      <section
        aria-label={t("payments")}
        id="payment"
        className={cn(panel, "lg:w-[55%] lg:flex-[1.22]")}
      >
        {open && error.forForm("payment") ? (
          <p role="alert" className="mx-4 mt-4 rounded-lg bg-red-50 px-3 py-2 text-[13.5px] font-semibold text-red-700 ring-1 ring-red-200">
            {error.forForm("payment")}
          </p>
        ) : null}

        {paid ? (
          <BillSuccessPanel order={order} changeTaka={changeTaka} />
        ) : payable ? (
          <PaymentForm
            orderId={order.id}
            dueTaka={order.dueTaka}
            paidTaka={order.paidTaka}
            totalTaka={order.totalTaka}
            credit={canGiveCredit ? { customerName: order.customer?.name ?? null } : null}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-[14px] text-muted-foreground">
            {open && lines.length === 0 ? t("nothingToPay") : t("allPaid")}
          </div>
        )}
      </section>
    </div>
  );
}