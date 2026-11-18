import Link from "next/link";
import { useTranslations } from "next-intl";
import { applyDiscount, returnPoints, spendPoints } from "@/actions/orders";
import { Icon } from "@/components/icons";
import { OrderTotals } from "@/components/order-totals";
import { CouponBox } from "@/components/coupon-box";
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
  const tCoupon = useTranslations("coupon");
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
        <header className="shrink-0 border-b px-4 pt-3 pb-4 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={orderHref(order.id)}
              className="-ml-1.5 inline-flex h-8 items-center gap-0.5 rounded-md px-1.5 text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon name="back" className="size-4" />
              {t("backToOrder")}
            </Link>
            <Link
              href={orderHref(order.id, "receipt")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold shadow-xs ring-1 ring-zinc-300 hover:bg-zinc-50"
            >
              <Icon name="printer" className="size-4" />
              {t("printReceipt")}
            </Link>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 px-2 text-[20px] font-bold text-orange-700"
            >
              {order.tableLabel ?? <Icon name="bag" className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
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
              <p className="truncate text-[13px] text-muted-foreground">
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
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {[
              { icon: "serve" as const, label: t("servedBy"), value: waiter },
              { icon: "cash" as const, label: t("cashier"), value: user.name },
            ]
              .filter((row) => row.value)
              .map((row) => (
                <div key={row.label} className="flex items-center gap-1.5">
                  <Icon
                    name={row.icon}
                    aria-hidden
                    className="size-3.5 text-muted-foreground"
                  />
                  <dt className="text-muted-foreground">{row.label}</dt>
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
            className="mb-4 rounded-xl border p-3"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[15px] font-bold text-sky-700"
              >
                {order.guestName ? (
                  order.guestName.trim()[0]?.toUpperCase()
                ) : (
                  <Icon name="users" className="size-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-muted-foreground">
                  {t("customer")}
                </p>
                <p className="truncate text-[14.5px] font-semibold">
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
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-[14px] font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Icon name="plus" className="size-4" />
                {t("addItems")}
              </Link>
            </div>
          ) : (
            <>
              {/* The receipt: one row per dish, like the printed bill. */}
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-y-2 border-select text-[12px] font-semibold tracking-wide uppercase">
                    <th scope="col" className="w-12 py-2 text-left">
                      {t("colQty")}
                    </th>
                    <th scope="col" className="py-2 text-left">
                      {t("colItem")}
                    </th>
                    <th
                      scope="col"
                      className="hidden py-2 text-right sm:table-cell"
                    >
                      {t("colPrice")}
                    </th>
                    <th scope="col" className="py-2 text-right">
                      {t("amountCol")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dotted divide-zinc-300">
                  {lines.map((line) => (
                    <tr key={line.key}>
                      <td className="py-2.5 align-top font-semibold tabular-nums">
                        {line.quantity}
                      </td>
                      <td className="py-2.5 pr-3 align-top">
                        <span className="block font-medium">{line.name}</span>
                        <span className="block text-[12.5px] text-muted-foreground tabular-nums sm:hidden">
                          {t("each", { price: formatTaka(line.unitPriceTaka) })}
                        </span>
                      </td>
                      <td className="hidden py-2.5 text-right align-top text-muted-foreground tabular-nums sm:table-cell">
                        {formatTaka(line.unitPriceTaka)}
                      </td>
                      <td className="py-2.5 text-right align-top font-semibold tabular-nums">
                        {formatTaka(line.totalTaka)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-select text-[12.5px] text-muted-foreground">
                    <td colSpan={4} className="pt-1.5">
                      {t("itemsCount", { n: itemCount })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}

          {open && (
            <section aria-label={tCoupon("title")} className="mt-3">
              <CouponBox order={order} error={error} back="bill" />
            </section>
          )}

          {open &&
            order.customer &&
            (order.loyalty || (order.customer.points ?? 0) > 0) && (
              <section
                id="loyalty"
                aria-labelledby="loyalty-title"
                className="mt-3 rounded-xl px-3 py-3 ring-1 ring-zinc-200"
              >
                <h3 id="loyalty-title" className="text-[14px] font-semibold">
                  {t("pointsTitle")}
                </h3>
                {error.forForm("loyalty") && (
                  <div className="mt-2">
                    <Notice>{error.forForm("loyalty")}</Notice>
                  </div>
                )}
                {order.loyalty ? (
                  <form
                    action={returnPoints}
                    className="mt-1 flex items-center justify-between gap-3"
                  >
                    <input type="hidden" name="orderId" value={order.id} />
                    <p className="text-[13.5px] text-muted-foreground">
                      {t("pointsUsed", { n: order.loyalty.spent })}
                    </p>
                    <button
                      type="submit"
                      className="h-10 shrink-0 rounded-lg px-3 text-[13.5px] font-semibold ring-1 ring-zinc-300 hover:bg-zinc-100"
                    >
                      {t("pointsRemove")}
                    </button>
                  </form>
                ) : (
                  <form action={spendPoints} className="mt-1">
                    <input type="hidden" name="orderId" value={order.id} />
                    <p className="text-[13.5px] text-muted-foreground">
                      {t("pointsBalance", {
                        name: order.customer.name,
                        n: order.customer.points ?? 0,
                      })}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <label className="block flex-1">
                        <span className="sr-only">{t("pointsAmount")}</span>
                        <input
                          name="points"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          required
                          defaultValue={Math.min(
                            order.customer.points ?? 0,
                            Math.floor(order.dueTaka),
                          )}
                          className={cn(inputClass, "font-bold tabular-nums")}
                        />
                      </label>
                      <button
                        type="submit"
                        className="h-11 shrink-0 rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        {t("pointsUse")}
                      </button>
                    </div>
                  </form>
                )}
              </section>
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
                        <span className="flex h-10 min-w-12 cursor-pointer items-center justify-center rounded-md px-3 text-[16px] font-bold text-zinc-500 peer-checked:bg-select peer-checked:text-white peer-focus-visible:ring-3 peer-focus-visible:ring-select/30">
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
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[14px] font-semibold text-primary-foreground hover:bg-primary/90"
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

      {/* Paying: the checkout panel. */}
      <section
        aria-label={t("payments")}
        id="payment"
        className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm lg:h-full"
      >
        {open && error.forForm("payment") && (
          <p
            role="alert"
            className="mx-5 mt-5 rounded-lg bg-red-50 px-3 py-2 text-[13.5px] font-semibold text-red-700 ring-1 ring-red-200"
          >
            {error.forForm("payment")}
          </p>
        )}
        {order.payments.length > 0 && (
          <div className="mx-5 mt-5 shrink-0">
            <p className="text-[13px] font-medium text-muted-foreground">
              {t("paidSoFar")}
            </p>
            <ul className="mt-1.5 space-y-1">
              {order.payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-1.5 text-[13px] ring-1 ring-zinc-200"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-semibold">{tMethod(p.method)}</span>
                    <span className="ml-1.5 text-muted-foreground">
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
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-zinc-100 text-zinc-500",
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
            <p className="mt-1 text-[13.5px] text-muted-foreground tabular-nums">
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
