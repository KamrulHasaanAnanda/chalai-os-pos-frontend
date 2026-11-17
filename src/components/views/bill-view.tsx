import Link from "next/link";
import { useTranslations } from "next-intl";
import { applyDiscount } from "@/actions/orders";
import { Icon } from "@/components/icons";
import { OrderTotals } from "@/components/order-totals";
import { OverrideFields } from "@/components/override-fields";
import { CustomerFields } from "@/components/customer-fields";
import { PAY_FORM_ID, PaymentForm } from "@/components/payment-form";
import { inputClass, Notice } from "@/components/app/field";
import type { Order, User } from "@/lib/api/types";
import type { ErrorReader } from "@/lib/error-reader";
import { formatTaka, formatTime } from "@/lib/format";
import { billLines } from "@/lib/order";
import { orderHref } from "@/lib/paths";
import { cn } from "@/lib/utils";

const panel =
  "flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm";

/**
 * The bill as a checkout: the receipt on the left (items and totals), paying on the right (what's due, method, cash
 * and change, discount). Both sides fill the screen on tablets and scroll on their own.
 */
export function BillView({
  order,
  user,
  timeZone: tz,
  error,
}: {
  order: Order;
  user: User;
  timeZone: string;
  error: ErrorReader;
}) {
  const t = useTranslations("bill");
  const tOrder = useTranslations("order");
  const tMethod = useTranslations("paymentMethod");
  const open = order.status === "open";
  const pendingRounds = order.rounds.filter(
    (r) => r.status === "pending_approval",
  ).length;
  const lines = billLines(order);
  // The staff member who sent the first round from the POS; QR-only orders have none.
  const waiter = order.rounds.find((r) => r.createdBy)?.createdBy?.name ?? null;
  const payable = open && order.dueTaka > 0;
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className="mx-auto max-w-[1400px] lg:grid lg:h-[calc(100dvh-7.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(400px,460px)] lg:gap-4 max-lg:space-y-4">
      {/* The receipt. */}
      <section aria-labelledby="bill-items" className={cn(panel, "lg:h-full")}>
        <header className="relative shrink-0 overflow-hidden bg-zinc-900 px-4 pt-3 pb-4 text-white sm:px-5">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-orange-500/25 blur-3xl"
          />
          <div className="relative flex items-center justify-between gap-2">
            <Link
              href={orderHref(order.id)}
              className="-ml-1.5 inline-flex h-8 items-center gap-0.5 rounded-md px-1.5 text-[13px] font-semibold text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <Icon name="back" className="size-4" />
              {t("backToOrder")}
            </Link>
            <Link
              href={orderHref(order.id, "receipt")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[13px] font-semibold ring-1 ring-white/15 hover:bg-white/15"
            >
              <Icon name="printer" className="size-4" />
              {t("printReceipt")}
            </Link>
          </div>
          <div className="relative mt-2 flex items-center gap-3">
            <span
              aria-hidden
              className={cn(
                "flex h-12 min-w-12 shrink-0 items-center justify-center rounded-xl px-2 text-[22px] font-bold",
                order.tableLabel
                  ? "bg-orange-500 text-white"
                  : "bg-white text-zinc-900",
              )}
            >
              {order.tableLabel ?? <Icon name="bag" className="size-6" />}
            </span>
            <div className="min-w-0">
              <h1
                id="bill-items"
                className="truncate text-[20px] leading-tight font-bold tracking-tight sm:text-[22px]"
              >
                {t("heading", {
                  table: order.tableLabel
                    ? tOrder("table", { table: order.tableLabel })
                    : order.tokenNo
                    ? tOrder("pickup", { token: order.tokenNo })
                    : tOrder("takeaway"),
                })}
              </h1>
              <p className="truncate text-[12.5px] text-zinc-400">
                {[
                  order.areaName,
                  tOrder("number", { number: order.number }),
                  t("openedAt", { time: formatTime(order.openedAt, tz) }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          {/* Who looked after the table and who is taking the money. */}
          <dl className="relative mt-3 flex flex-wrap gap-1.5 text-[12.5px]">
            {[
              { icon: "serve" as const, label: t("servedBy"), value: waiter },
              { icon: "cash" as const, label: t("cashier"), value: user.name },
            ]
              .filter((row) => row.value)
              .map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pr-3 pl-1.5 ring-1 ring-white/10"
                >
                  <span
                    aria-hidden
                    className="flex size-5 items-center justify-center rounded-full bg-white/15"
                  >
                    <Icon name={row.icon} className="size-3" />
                  </span>
                  <dt className="text-zinc-400">{row.label}</dt>
                  <dd className="font-semibold">{row.value}</dd>
                </div>
              ))}
          </dl>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {error.general && <Notice className="mb-3">{error.general}</Notice>}
          {!open && (
            <Notice
              className="mb-3"
              tone={order.status === "paid" ? "ok" : "error"}
            >
              {order.status === "paid" ? t("alreadyPaid") : t("cancelledOrder")}
            </Notice>
          )}
          {open && pendingRounds > 0 && (
            <Notice className="mb-3" tone="info">
              {t("pendingRounds")}{" "}
              <Link
                href={orderHref(order.id)}
                className="font-semibold underline"
              >
                {t("goApprove")}
              </Link>
            </Notice>
          )}

          {/* Who the bill is for. While money is due the fields belong to the payment form (form=PAY_FORM_ID). */}
          <section
            aria-label={t("customer")}
            className="mb-3 rounded-xl bg-sky-50 p-3 ring-1 ring-sky-200"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-600 text-[16px] font-bold text-white"
              >
                {order.guestName ? (
                  order.guestName.trim()[0]?.toUpperCase()
                ) : (
                  <Icon name="users" className="size-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold tracking-wide text-sky-700 uppercase">
                  {t("customer")}
                </p>
                <p className="truncate text-[15px] font-bold">
                  {[order.guestName ?? t("walkIn"), order.guestPhone]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            {payable && (
              <CustomerFields
                orderId={order.id}
                formId={PAY_FORM_ID}
                initialName={order.guestName ?? ""}
                initialPhone={order.guestPhone ?? ""}
                attached={order.customer ?? null}
              />
            )}
          </section>

          {lines.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span
                aria-hidden
                className="flex size-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400"
              >
                <Icon name="receipt" className="size-7" />
              </span>
              <p className="mt-3 text-[16px] font-bold">{t("noItems")}</p>
              <p className="mt-1 max-w-[300px] text-[13.5px] text-muted-foreground">
                {t("noItemsBody")}
              </p>
              <Link
                href={orderHref(order.id)}
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-[14px] font-semibold text-white hover:bg-zinc-800"
              >
                <Icon name="plus" className="size-4" />
                {t("addItems")}
              </Link>
            </div>
          ) : (
            <>
              <p className="flex items-center justify-between text-[12px] font-bold tracking-wide text-zinc-500 uppercase">
                <span>{t("itemsCount", { n: itemCount })}</span>
                <span>{t("amountCol")}</span>
              </p>
              <ul className="mt-1 divide-y divide-dashed divide-zinc-200">
                {lines.map((line) => (
                  <li
                    key={line.key}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 px-1.5 text-[13px] font-bold tabular-nums">
                        {line.quantity}×
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold">
                          {line.name}
                        </span>
                        <span className="block text-[12.5px] text-muted-foreground tabular-nums">
                          {t("each", { price: formatTaka(line.unitPriceTaka) })}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-[15px] font-bold tabular-nums">
                      {formatTaka(line.totalTaka)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {open && lines.length > 0 && (
            <details
              id="discount"
              open={!!error.forForm("discount")}
              className="group mt-3 rounded-xl ring-1 ring-zinc-200"
            >
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-3 text-[14px] font-semibold">
                <span
                  aria-hidden
                  className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600"
                >
                  <Icon name="percent" className="size-4" />
                </span>
                <span className="flex-1">
                  {order.discountTaka > 0
                    ? t("discountApplied", {
                        amount: formatTaka(order.discountTaka),
                      })
                    : t("addDiscount")}
                </span>
                <Icon
                  name="go"
                  className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
                />
              </summary>
              <form action={applyDiscount} className="border-t px-3 pt-3 pb-3">
                <input type="hidden" name="orderId" value={order.id} />
                <p className="text-[13px] text-muted-foreground">
                  {t("discountBody")}
                </p>
                {error.forForm("discount") && (
                  <div className="mt-2">
                    <Notice>{error.forForm("discount")}</Notice>
                  </div>
                )}
                <div className="mt-2 grid grid-cols-[auto_1fr] items-end gap-2">
                  <fieldset className="flex rounded-lg bg-zinc-100 p-1">
                    <legend className="sr-only">{t("discountKind")}</legend>
                    {(["amount", "percent"] as const).map((kind) => (
                      <label key={kind}>
                        <input
                          type="radio"
                          name="kind"
                          value={kind}
                          defaultChecked={kind === "amount"}
                          className="peer sr-only"
                        />
                        <span className="flex h-10 min-w-12 cursor-pointer items-center justify-center rounded-md px-3 text-[16px] font-bold text-zinc-500 peer-checked:bg-zinc-900 peer-checked:text-white peer-focus-visible:ring-3 peer-focus-visible:ring-zinc-900/30">
                          {kind === "amount" ? "৳" : "%"}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <label className="block">
                    <span className="sr-only">{t("discountValue")}</span>
                    <input
                      name="value"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      defaultValue={order.discountTaka || ""}
                      placeholder="0"
                      className={cn(inputClass, "font-bold tabular-nums")}
                    />
                  </label>
                </div>
                <label className="mt-2 block text-[13.5px] font-semibold">
                  {t("discountReason")}
                  <input
                    name="reason"
                    maxLength={200}
                    defaultValue={order.discountReason ?? ""}
                    placeholder={t("discountPlaceholder")}
                    className={cn(inputClass, "mt-1")}
                  />
                </label>
                <OverrideFields role={user.role} idPrefix="discount" />
                <button
                  type="submit"
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-[14px] font-semibold text-white hover:bg-zinc-800"
                >
                  <Icon name="percent" className="size-4" />
                  {t("applyDiscount")}
                </button>
              </form>
            </details>
          )}
        </div>

        <footer className="shrink-0 border-t bg-zinc-50 px-4 py-3 sm:px-5">
          <OrderTotals order={order} compact />
        </footer>
      </section>

      {/* Paying: dark checkout panel. */}
      <section
        aria-label={t("payments")}
        id="payment"
        className="flex flex-col overflow-hidden rounded-2xl bg-zinc-900 text-white shadow-sm lg:h-full"
      >
        {open && error.forForm("payment") && (
          <p
            role="alert"
            className="mx-5 mt-5 rounded-lg bg-red-500/15 px-3 py-2 text-[13.5px] font-semibold text-red-300 ring-1 ring-red-400/30"
          >
            {error.forForm("payment")}
          </p>
        )}
        {order.payments.length > 0 && (
          <div className="mx-5 mt-5 shrink-0">
            <p className="text-[11.5px] font-bold tracking-wide text-zinc-400 uppercase">
              {t("paidSoFar")}
            </p>
            <ul className="mt-1.5 space-y-1">
              {order.payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-1.5 text-[13px] ring-1 ring-white/10"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-semibold">{tMethod(p.method)}</span>
                    <span className="ml-1.5 text-zinc-400">
                      {[
                        formatTime(p.createdAt, tz),
                        p.receivedBy.name,
                        p.reference,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">
                    {formatTaka(p.amountTaka)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {payable ? (
          <PaymentForm
            orderId={order.id}
            dueTaka={order.dueTaka}
            paidTaka={order.paidTaka}
            totalTaka={order.totalTaka}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <span
              aria-hidden
              className={cn(
                "flex size-14 items-center justify-center rounded-2xl",
                order.status === "paid" || (open && lines.length > 0)
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-white/10 text-zinc-400",
              )}
            >
              <Icon
                name={
                  order.status === "paid" || (open && lines.length > 0)
                    ? "checkCircle"
                    : "receipt"
                }
                className="size-7"
              />
            </span>
            <p className="mt-3 text-[18px] font-bold">
              {order.status === "paid"
                ? t("alreadyPaid")
                : !open
                  ? t("cancelledOrder")
                  : lines.length === 0
                    ? t("nothingToPay")
                    : t("allPaid")}
            </p>
            <p className="mt-1 text-[13.5px] text-zinc-400 tabular-nums">
              {t("dueDetail", {
                total: formatTaka(order.totalTaka),
                paid: formatTaka(order.paidTaka),
              })}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
