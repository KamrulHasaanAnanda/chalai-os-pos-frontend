import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { cancelOrder } from "@/actions/orders";
import { inputClass, Notice } from "@/components/app/field";
import { Icon } from "@/components/icons";
import { OrderDrawer } from "@/components/orders/order-drawer";
import { OrdersBoard } from "@/components/orders/orders-board";
import { orderNo } from "@/lib/order-no";
import { OrderTotals } from "@/components/order-totals";
import { OverrideFields } from "@/components/override-fields";
import { TopBarStart } from "@/components/top-bar-start";
import { DayField } from "@/components/views/day-field";
import type { Order, OrderStatus, OrderSummary, User } from "@/lib/api/types";
import { titleCaseLabel } from "@/lib/bill-display";
import type { ErrorReader } from "@/lib/error-reader";
import { businessDate, formatTaka, formatTime, minutesSince } from "@/lib/format";
import { nestToppings } from "@/lib/modifiers";
import { orderHref } from "@/lib/paths";
import { billRoles } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const orderStatuses: OrderStatus[] = ["open", "paid", "cancelled"];

/** YYYY-MM-DD plus or minus whole days, without timezone drift. */
function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const prettyDate = (date: string, locale: string) =>
  new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

const weekday = (date: string, locale: string) =>
  new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

const shortDay = (iso: string, timeZone: string, locale: string) =>
  new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", timeZone }).format(
    new Date(iso),
  );

/**
 * One day's orders: the date in the top bar, four numbers, any stale orders (open far too long) in a red banner of
 * their own, then one dense list of the day's orders. Tapping an order opens its details in a side drawer.
 */
export function OrdersView({
  orders,
  date,
  today,
  timeZone: tz,
  user,
  staleHours,
  viewed,
  error,
}: {
  orders: OrderSummary[];
  date: string;
  today: string;
  timeZone: string;
  user: User;
  staleHours: number;
  /** The order open in the drawer (?view=), or "error" when it couldn't be loaded. */
  viewed: Order | "error" | null;
  error: ErrorReader;
}) {
  const t = useTranslations("orders");
  const locale = useLocale();
  const isToday = date === today;
  const canBill = billRoles.includes(user.role);
  const dayHref = (day: string) => (day === today ? "/orders" : `/orders?date=${day}`);
  const here = dayHref(date);

  // Stale: still open after `staleHours` (a table left open across days). Kept out of the list and the numbers.
  const stale = orders.filter((o) => o.status === "open" && minutesSince(o.openedAt) >= staleHours * 60);
  const list = orders.filter((o) => !stale.includes(o));
  // The day's numbers count only orders opened on that day.
  const counted = list.filter((o) => o.status !== "cancelled" && businessDate(tz, new Date(o.openedAt)) === date);
  const sales = counted.reduce((sum, o) => sum + o.totalTaka, 0);
  const due = counted.reduce((sum, o) => sum + o.dueTaka, 0);
  const avg = counted.length ? Math.round(sales / counted.length) : 0;
  const voidError = stale.some((o) => error.forForm(`void-${o.id}`));

  const head = (
    <form method="get" action="/orders" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 md:flex-nowrap">
      <h1 className="flex min-w-0 items-center gap-2 text-[22px] leading-tight font-bold tracking-tight md:text-[17px]">
        {/* Narrow top bar (tablets): the picker already shows the date, so only the weekday. */}
        <span className="truncate md:max-lg:hidden">{prettyDate(date, locale)}</span>
        {/* …and on today, the Today pill says it. */}
        {!isToday && <span className="hidden truncate md:max-lg:inline">{weekday(date, locale)}</span>}
        {isToday && (
          <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[11.5px] font-semibold text-white">
            {t("todayPill")}
          </span>
        )}
      </h1>
      <div className="flex shrink-0 items-center rounded-lg border bg-card">
        <Link
          href={dayHref(shiftDate(date, -1))}
          aria-label={t("previousDay")}
          title={t("previousDay")}
          className="flex size-9 items-center justify-center rounded-l-lg hover:bg-muted focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none"
        >
          <Icon name="back" className="size-4" />
        </Link>
        <span className="border-x [&_label]:h-9 [&_label]:rounded-none">
          <DayField date={date} today={today} />
        </span>
        {isToday ? (
          <span aria-hidden className="flex size-9 items-center justify-center text-zinc-300">
            <Icon name="go" className="size-4" />
          </span>
        ) : (
          <Link
            href={dayHref(shiftDate(date, 1))}
            aria-label={t("nextDay")}
            title={t("nextDay")}
            className="flex size-9 items-center justify-center rounded-r-lg hover:bg-muted focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none"
          >
            <Icon name="go" className="size-4" />
          </Link>
        )}
      </div>
      {!isToday && (
        <Link
          href="/orders"
          className="flex h-9 shrink-0 items-center rounded-lg px-2.5 md:max-xl:hidden text-[13px] font-semibold text-zinc-700 hover:bg-muted"
        >
          {t("backToToday")}
        </Link>
      )}
    </form>
  );

  const stats: { label: string; value: string; sub?: string; dot?: boolean }[] = [
    { label: t("total"), value: formatTaka(sales), sub: t("showing", { n: counted.length }) },
    { label: t("collected"), value: formatTaka(sales - due) },
    { label: t("due"), value: formatTaka(due), dot: due > 0 },
    { label: t("avgTicket"), value: formatTaka(avg) },
  ];

  return (
    <div className="space-y-4">
      {/* Tablets and laptops: the date sits in the top bar. Phones: here. */}
      <TopBarStart>{head}</TopBarStart>
      <div className="md:hidden">{head}</div>

      {error.general && <Notice>{error.general}</Notice>}

      {stale.length > 0 && (
        <details
          open={voidError || undefined}
          className="group overflow-hidden rounded-xl border border-red-200 bg-red-50 text-red-950"
        >
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <Icon name="alert" className="size-5 shrink-0 text-red-600" />
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold">{t("staleBanner", { n: stale.length })}</span>
              <span className="block text-[13px] text-red-800">{t("staleHint", { h: staleHours })}</span>
            </span>
            <span className="inline-flex h-9 items-center rounded-lg bg-red-600 px-3.5 text-[13.5px] font-semibold text-white group-open:bg-white group-open:text-red-700 group-open:ring-1 group-open:ring-red-200">
              <span className="group-open:hidden">{t("review")}</span>
              <span className="hidden group-open:inline">{t("hideStale")}</span>
            </span>
          </summary>
          <ul className="divide-y divide-red-100 border-t border-red-200 bg-white">
            {stale.map((o) => {
              const formError = error.forForm(`void-${o.id}`);
              return (
                <li key={o.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="text-[15px] font-semibold">{where(o, t)}</span>
                        <span className="font-mono text-[14px] font-semibold text-zinc-700">{orderNo(o.number)}</span>
                      </span>
                      <span className="block text-[13px] text-zinc-600">
                        {t("openedOn", { date: `${shortDay(o.openedAt, tz, locale)} ${formatTime(o.openedAt, tz)}` })}
                        {" · "}
                        <span className="font-semibold text-red-700">
                          {t("staleOpenFor", { h: Math.floor(minutesSince(o.openedAt) / 60) })}
                        </span>
                      </span>
                    </span>
                    <span className="text-[15px] font-bold tabular-nums">{formatTaka(o.dueTaka)}</span>
                    <span className="flex gap-2">
                      {canBill && (
                        <Link
                          href={orderHref(o.id, "bill")}
                          className="inline-flex h-10 items-center rounded-lg border border-input bg-card px-3.5 text-[13.5px] font-semibold hover:bg-zinc-50"
                        >
                          {t("closeStale")}
                        </Link>
                      )}
                      <details id={`void-${o.id}`} open={!!formError} className="group/void">
                        <summary className="inline-flex h-10 cursor-pointer list-none items-center rounded-lg border border-red-200 bg-card px-3.5 text-[13.5px] font-semibold text-red-700 hover:bg-red-50 group-open/void:bg-red-50 [&::-webkit-details-marker]:hidden">
                          {t("voidStale")}
                        </summary>
                      </details>
                    </span>
                  </div>
                  <form
                    action={cancelOrder}
                    className={cn(
                      "mt-3 grid gap-2 rounded-lg bg-red-50/60 p-3 ring-1 ring-red-100 sm:max-w-md",
                      !formError && "hidden [li:has(details[open])>&]:grid",
                    )}
                  >
                    <input type="hidden" name="orderId" value={o.id} />
                    <input type="hidden" name="back" value="orders" />
                    {formError && <Notice>{formError}</Notice>}
                    <label className="text-[13.5px] font-semibold">
                      {t("voidReason")}
                      <input
                        name="reason"
                        required
                        maxLength={200}
                        placeholder={t("voidPlaceholder")}
                        className={cn(inputClass, "mt-1.5")}
                      />
                    </label>
                    <OverrideFields role={user.role} idPrefix={`void-${o.id}`} />
                    <button
                      type="submit"
                      className="h-10 rounded-lg bg-red-600 px-4 text-[13.5px] font-semibold text-white hover:bg-red-500"
                    >
                      {t("confirmVoid", { number: orderNo(o.number) })}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {/* The day's numbers: only orders opened on this day. */}
      <dl className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={cn(
              "min-w-0 px-4 py-3",
              i % 2 === 1 && "border-l",
              i >= 2 && "border-t lg:border-t-0",
              i > 0 && "lg:border-l",
            )}
          >
            <dt className="flex items-center gap-1.5 truncate text-[12.5px] font-medium text-muted-foreground">
              {stat.dot && <span aria-hidden className="size-2 shrink-0 rounded-full bg-amber-500" />}
              {stat.label}
            </dt>
            <dd className="mt-0.5 truncate text-[22px] leading-tight font-bold text-zinc-900 tabular-nums">
              {stat.value}
            </dd>
            {stat.sub && <dd className="text-[12.5px] text-muted-foreground tabular-nums">{stat.sub}</dd>}
          </div>
        ))}
      </dl>

      <OrdersBoard orders={list} timeZone={tz} canBill={canBill} isToday={isToday} here={here} />

      {viewed && (
        <OrderDrawer
          key={viewed === "error" ? "error" : viewed.id}
          closeHref={here}
          title={viewed === "error" ? t("details") : `${whereOrder(viewed, t)} · ${orderNo(viewed.number)}`}
          closeLabel={t("closeDrawer")}
        >
          {viewed === "error" ? (
            <p className="p-5 text-[14px] text-muted-foreground">{t("notFound")}</p>
          ) : (
            <DrawerBody order={viewed} tz={tz} canBill={canBill} />
          )}
        </OrderDrawer>
      )}
    </div>
  );
}

type T = ReturnType<typeof useTranslations<"orders">>;

function where(o: OrderSummary, t: T) {
  return o.tableLabel
    ? t("table", { table: o.tableLabel })
    : o.tokenNo
      ? t("pickup", { token: o.tokenNo })
      : t("takeaway");
}

function whereOrder(o: Order, t: T) {
  return o.tableLabel
    ? t("table", { table: o.tableLabel })
    : o.tokenNo
      ? t("pickup", { token: o.tokenNo })
      : t("takeaway");
}

/** The drawer: what was ordered, the totals, payments, and the way on (open, bill, receipt). */
function DrawerBody({ order, tz, canBill }: { order: Order; tz: string; canBill: boolean }) {
  const t = useTranslations("orders");
  const tMethod = useTranslations("paymentMethod");
  const tOrder = useTranslations("order");
  const tStatus = useTranslations("orderStatus");
  const rounds = order.rounds.filter((r) => r.status !== "rejected");
  const server = order.rounds.find((r) => r.createdBy)?.createdBy?.name;
  const open = order.status === "open";
  const btn =
    "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-semibold focus-visible:ring-3 focus-visible:ring-select/30 focus-visible:outline-none [&_svg]:size-[18px]";

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
          {/* Orange is kept for the main action; status reads grey (open), green (paid), muted (cancelled). */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold",
              order.status === "paid"
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                : order.status === "open"
                  ? "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200"
                  : "bg-zinc-50 text-zinc-500 ring-1 ring-zinc-200",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                order.status === "paid" ? "bg-emerald-500" : order.status === "open" ? "bg-zinc-800" : "bg-zinc-300",
              )}
            />
            {tStatus(order.status)}
          </span>
          <span className="tabular-nums">
            {formatTime(order.openedAt, tz)}
            {order.closedAt && ` – ${formatTime(order.closedAt, tz)}`}
          </span>
          {order.areaName && <span>· {order.areaName}</span>}
          {server && <span>· {t("by", { name: server })}</span>}
        </div>

        {rounds.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-3 text-[13.5px] text-muted-foreground">{t("noItems")}</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {rounds
              .flatMap((r) => nestToppings(r.items))
              .map(({ item, toppings }) => {
                const off = !!item.cancelledAt;
                return (
                  <li key={item.id} className={cn("px-3 py-2.5", off && "text-muted-foreground line-through")}>
                    <div className="flex items-start gap-2">
                      <span className="w-7 shrink-0 text-[13.5px] font-bold tabular-nums">{item.quantity}×</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold">{titleCaseLabel(item.name)}</span>
                        {item.note && <span className="block text-[12.5px] text-amber-800">{item.note}</span>}
                      </span>
                      <span className="text-[14px] font-semibold tabular-nums">{formatTaka(item.lineTotalTaka)}</span>
                    </div>
                    {toppings.map((x) => (
                      <div key={x.id} className="mt-0.5 ml-9 flex justify-between gap-2 text-[13px] text-zinc-600">
                        <span>+ {titleCaseLabel(x.name)}</span>
                        <span className="tabular-nums">{formatTaka(x.lineTotalTaka)}</span>
                      </div>
                    ))}
                  </li>
                );
              })}
          </ul>
        )}

        <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
          <OrderTotals order={order} compact billSummary={order.paidTaka === 0} />
        </div>

        {order.payments.length > 0 && (
          <section>
            <h3 className="mb-1.5 text-[13px] font-semibold text-zinc-700">{t("payments")}</h3>
            <ul className="divide-y rounded-xl border text-[13.5px]">
              {order.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span>
                    {tMethod(p.method)}
                    <span className="ml-2 text-muted-foreground tabular-nums">{formatTime(p.createdAt, tz)}</span>
                  </span>
                  <span className="font-semibold text-emerald-700 tabular-nums">{formatTaka(p.amountTaka)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <footer className="flex shrink-0 gap-2 border-t bg-card p-4">
        <Link href={orderHref(order.id)} className={cn(btn, "border border-input bg-card hover:bg-zinc-50")}>
          <Icon name="eye" />
          {open ? t("openOrder") : tOrder("title", { number: order.number })}
        </Link>
        {open && canBill && (
          <Link href={orderHref(order.id, "bill")} className={cn(btn, "bg-primary text-primary-foreground hover:bg-primary/90")}>
            <Icon name="cash" />
            {t("bill")}
          </Link>
        )}
        {order.status === "paid" && canBill && (
          <Link href={orderHref(order.id, "receipt")} className={cn(btn, "border border-input bg-card hover:bg-zinc-50")}>
            <Icon name="printer" />
            {t("receipt")}
          </Link>
        )}
      </footer>
    </>
  );
}
