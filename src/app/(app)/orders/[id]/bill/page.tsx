import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { applyDiscount } from "@/actions/orders";
import { cardClass, fieldClass, Notice } from "@/components/form";
import { Icon } from "@/components/icons";
import { OrderTotals } from "@/components/order-totals";
import { OverrideFields } from "@/components/override-fields";
import { PaymentForm } from "@/components/payment-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { getOrder } from "@/lib/data";
import { readError } from "@/lib/errors";
import { billLines } from "@/lib/order";
import { formatTaka, formatTime } from "@/lib/format";
import { billRoles, requireStaff } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/orders/[id]/bill">): Promise<Metadata> {
  const t = await getTranslations("bill");
  const order = await getOrder((await params).id);
  return { title: t("title", { number: order.number }) };
}

export default async function BillPage({ params, searchParams }: PageProps<"/orders/[id]/bill">) {
  const { id } = await params;
  const { user, restaurant } = await requireStaff({ roles: billRoles });
  const order = await getOrder(id);
  const t = await getTranslations("bill");
  const tOrder = await getTranslations("order");
  const tMethod = await getTranslations("paymentMethod");
  const error = await readError(searchParams);
  const tz = restaurant.timezone;
  const open = order.status === "open";
  const pendingRounds = order.rounds.filter((r) => r.status === "pending_approval").length;
  const lines = billLines(order);

  return (
    <div id="top" className="mx-auto max-w-[1100px] space-y-4">
      <Link href={`/orders/${order.id}`} className="inline-flex min-h-12 items-center gap-1 text-[15.5px] font-bold text-maroon">
        <Icon name="back" />
        {t("backToOrder")}
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-[28px] leading-tight font-extrabold sm:text-[34px]">
            {t("heading", { table: order.tableLabel ?? tOrder("takeaway") })}
          </h1>
          <p className="text-muted-foreground">
            {[order.areaName, tOrder("number", { number: order.number }), formatTime(order.openedAt, tz)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Link href={`/orders/${order.id}/receipt`} className={buttonVariants({ variant: "soft", size: "pillSm" })}>
          <Icon name="printer" />
          {t("printReceipt")}
        </Link>
      </div>

      {error.general && <Notice>{error.general}</Notice>}
      {!open && <Notice tone={order.status === "paid" ? "ok" : "error"}>{order.status === "paid" ? t("alreadyPaid") : t("cancelledOrder")}</Notice>}
      {open && pendingRounds > 0 && (
        <Notice tone="info">
          {t("pendingRounds")}{" "}
          <Link href={`/orders/${order.id}`} className="underline">
            {t("goApprove")}
          </Link>
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section aria-labelledby="bill-items" className={cardClass}>
          <h2 id="bill-items" className="text-[18px] font-extrabold">
            {t("items")}
          </h2>
          {lines.length === 0 ? (
            <p className="mt-2 text-muted-foreground">{t("noItems")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {lines.map((line) => (
                <li key={line.key} className="flex items-baseline justify-between gap-3 py-2 text-[16.5px]">
                  <span>
                    <span className="font-bold tabular-nums">{line.quantity} ×</span> {line.name}
                    <span className="ml-1 text-[14px] text-muted-foreground">@ {formatTaka(line.unitPriceTaka)}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatTaka(line.totalTaka)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 border-t-2 border-line pt-2">
            <OrderTotals order={order} large />
          </div>
        </section>

        <div className="space-y-4">
          {open && (
            <section aria-labelledby="discount-title" id="discount" className={cardClass}>
              <h2 id="discount-title" className="text-[18px] font-extrabold">
                {t("discountTitle")}
              </h2>
              <p className="text-[14.5px] text-muted-foreground">{t("discountBody")}</p>
              {error.forForm("discount") && (
                <div className="mt-2">
                  <Notice>{error.forForm("discount")}</Notice>
                </div>
              )}
              <form action={applyDiscount} className="mt-2">
                <input type="hidden" name="orderId" value={order.id} />
                <div className="grid grid-cols-[auto_1fr] items-end gap-2">
                  <fieldset className="flex rounded-xl bg-gray p-1">
                    <legend className="sr-only">{t("discountKind")}</legend>
                    {(["amount", "percent"] as const).map((kind) => (
                      <label key={kind}>
                        <input type="radio" name="kind" value={kind} defaultChecked={kind === "amount"} className="peer sr-only" />
                        <span className="flex min-h-12 min-w-14 cursor-pointer items-center justify-center rounded-lg px-3 text-[17px] font-extrabold peer-checked:bg-white peer-checked:shadow peer-focus-visible:ring-3 peer-focus-visible:ring-maroon/40">
                          {kind === "amount" ? "৳" : "%"}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <label className="block text-[15.5px] font-bold">
                    <span className="sr-only">{t("discountValue")}</span>
                    <input
                      name="value"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      defaultValue={order.discountTaka || ""}
                      placeholder="0"
                      className={cn(fieldClass, "mt-0 tabular-nums")}
                    />
                  </label>
                </div>
                <label className="mt-3 block text-[15.5px] font-bold">
                  {t("discountReason")}
                  <input name="reason" maxLength={200} defaultValue={order.discountReason ?? ""} placeholder={t("discountPlaceholder")} className={fieldClass} />
                </label>
                <OverrideFields role={user.role} idPrefix="discount" />
                <button type="submit" className={cn(buttonVariants({ variant: "soft", size: "pill" }), "mt-3 w-full")}>
                  {t("applyDiscount")}
                </button>
              </form>
            </section>
          )}

          <section aria-labelledby="payments-title" id="payment" className={cardClass}>
            <h2 id="payments-title" className="text-[18px] font-extrabold">
              {t("payments")}
            </h2>
            {order.payments.length === 0 ? (
              <p className="mt-1 text-muted-foreground">{t("noPayments")}</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-3 py-2">
                    <span>
                      <span className="font-bold">{tMethod(p.method)}</span>
                      <span className="ml-2 text-[14px] text-muted-foreground">
                        {[
                          formatTime(p.createdAt, tz),
                          p.receivedBy.name,
                          p.reference,
                          p.tenderedTaka ? t("tenderedChange", { tendered: formatTaka(p.tenderedTaka), change: formatTaka(p.tenderedTaka - p.amountTaka) }) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatTaka(p.amountTaka)}</span>
                  </li>
                ))}
              </ul>
            )}
            {open && (
              <div className="mt-3 border-t-2 border-line pt-3">
                <p className="mb-3 flex items-baseline justify-between text-[18px] font-extrabold">
                  <span>{t("due")}</span>
                  <span className="text-[26px] text-late tabular-nums">{formatTaka(order.dueTaka)}</span>
                </p>
                {error.forForm("payment") && (
                  <div className="mb-3">
                    <Notice>{error.forForm("payment")}</Notice>
                  </div>
                )}
                {order.dueTaka > 0 && <PaymentForm orderId={order.id} dueTaka={order.dueTaka} />}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
