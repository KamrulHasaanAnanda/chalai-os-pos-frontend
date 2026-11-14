import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/icons";
import type { OrderStatus, OrderSummary } from "@/lib/api/types";
import { formatTaka, formatTime, minutesSince } from "@/lib/format";
import { orderHref } from "@/lib/paths";
import { cn } from "@/lib/utils";

export const orderStatuses: OrderStatus[] = ["open", "paid", "cancelled"];

/** An open table this long is worth a nudge. */
const LONG_MINUTES = 90;

const DOT: Record<OrderStatus, string> = {
  open: "bg-orange-500",
  paid: "bg-emerald-600",
  cancelled: "bg-zinc-400",
};

/** YYYY-MM-DD plus or minus whole days, without timezone drift. */
function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const prettyDate = (date: string) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

/** Open orders as cards to act on, then the day's closed orders as a compact list. */
export function OrdersView({
  orders,
  status,
  date,
  today,
  timeZone,
}: {
  orders: OrderSummary[];
  status?: OrderStatus;
  date: string;
  today: string;
  timeZone: string;
}) {
  const t = useTranslations("orders");
  const tStatus = useTranslations("orderStatus");

  const href = (next: { status?: OrderStatus; date?: string }) => {
    const search = new URLSearchParams();
    if (next.status) search.set("status", next.status);
    if (next.date && next.date !== today) search.set("date", next.date);
    return search.size ? `/orders?${search}` : "/orders";
  };
  const isToday = date === today;
  const open = orders.filter((o) => o.status === "open");
  const closed = orders.filter((o) => o.status !== "open");
  const counted = orders.filter((o) => o.status !== "cancelled");
  const sales = counted.reduce((sum, o) => sum + o.totalTaka, 0);
  const due = open.reduce((sum, o) => sum + o.dueTaka, 0);
  const collected = sales - due;
  const span = (minutes: number) =>
    minutes < 60
      ? t("minutes", { n: minutes })
      : t("hours", { h: Math.floor(minutes / 60), m: minutes % 60 });

  const stats: {
    label: string;
    value: string;
    icon: IconName;
    tone: string;
  }[] = [
    {
      label: t("total"),
      value: formatTaka(sales),
      icon: "cash",
      tone: "bg-zinc-900 text-white",
    },
    {
      label: t("collected"),
      value: formatTaka(collected),
      icon: "checkCircle",
      tone: "bg-emerald-600 text-white",
    },
    {
      label: t("due"),
      value: formatTaka(due),
      icon: "clock",
      tone: due > 0 ? "bg-orange-500 text-white" : "bg-zinc-100 text-zinc-400",
    },
    {
      label: t("count"),
      value: String(orders.length),
      icon: "receipt",
      tone: "bg-blue-600 text-white",
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      {/* Title and day picker. */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold text-muted-foreground">
            {isToday ? t("today") : t("pastDay")}
          </p>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight sm:text-[30px]">
            {prettyDate(date)}
          </h1>
        </div>
        <form
          method="get"
          action="/orders"
          className="flex items-center gap-1 self-start rounded-xl border bg-card p-1 shadow-xs sm:self-auto"
        >
          {status && <input type="hidden" name="status" value={status} />}
          <Link
            href={href({ status, date: shiftDate(date, -1) })}
            aria-label={t("previousDay")}
            className="flex size-10 items-center justify-center rounded-lg hover:bg-muted"
          >
            <Icon name="back" className="size-5" />
          </Link>
          <label className="flex h-10 items-center rounded-lg px-2 hover:bg-muted">
            <span className="sr-only">{t("date")}</span>
            <input
              type="date"
              name="date"
              defaultValue={date}
              max={today}
              className="bg-transparent text-[14px] font-semibold tabular-nums outline-none"
            />
          </label>
          <button
            type="submit"
            className="h-10 rounded-lg bg-zinc-900 px-3.5 text-[13.5px] font-semibold text-white hover:bg-zinc-800"
          >
            {t("show")}
          </button>
          {isToday ? (
            <span
              aria-hidden
              className="flex size-10 items-center justify-center text-zinc-300"
            >
              <Icon name="go" className="size-5" />
            </span>
          ) : (
            <>
              <Link
                href={href({ status, date: shiftDate(date, 1) })}
                aria-label={t("nextDay")}
                className="flex size-10 items-center justify-center rounded-lg hover:bg-muted"
              >
                <Icon name="go" className="size-5" />
              </Link>
              <Link
                href={href({ status })}
                className="flex h-10 items-center rounded-lg px-3 text-[13.5px] font-semibold text-orange-700 hover:bg-orange-50"
              >
                {t("today")}
              </Link>
            </>
          )}
        </form>
      </header>

      {/* Money for the day. */}
      <dl className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3 sm:p-4"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl",
                stat.tone,
              )}
            >
              <Icon name={stat.icon} className="size-5" />
            </span>
            <div className="min-w-0">
              <dt className="truncate text-[12.5px] font-semibold text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="truncate text-[22px] leading-tight font-bold tabular-nums">
                {stat.value}
              </dd>
            </div>
          </div>
        ))}
      </dl>

      {/* Filter. */}
      <nav aria-label={t("filter")} className="max-w-full overflow-x-auto">
        <ul className="inline-flex gap-1 rounded-xl bg-muted p-1">
          {[undefined, ...orderStatuses].map((s) => {
            const active = s === status;
            return (
              <li key={s ?? "all"}>
                <Link
                  href={href({ status: s, date })}
                  aria-current={active ? "page" : undefined}
                  scroll={false}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-4 text-[13.5px] font-semibold whitespace-nowrap transition-colors",
                    active
                      ? "bg-card text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900",
                  )}
                >
                  {s && (
                    <span
                      aria-hidden
                      className={cn("size-2 rounded-full", DOT[s])}
                    />
                  )}
                  {s ? tStatus(s) : t("all")}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {orders.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-zinc-300 px-6 py-14 text-center">
          <span
            aria-hidden
            className="flex size-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400"
          >
            <Icon name="inbox" className="size-7" />
          </span>
          <p className="mt-3 text-[16px] font-bold">{t("emptyTitle")}</p>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {t("empty")}
          </p>
        </div>
      )}

      {open.length > 0 && (
        <section aria-labelledby="open-orders" className="space-y-3">
          <h2
            id="open-orders"
            className="flex items-center gap-2 text-[17px] font-bold"
          >
            <span aria-hidden className="size-2.5 rounded-full bg-orange-500" />
            {t("openNow")}
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[12.5px] font-bold text-orange-700 tabular-nums">
              {open.length}
            </span>
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {open.map((order) => {
              const minutes = minutesSince(order.openedAt);
              const long = isToday && minutes >= LONG_MINUTES;
              return (
                <li
                  key={order.id}
                  className={cn(
                    "flex flex-col rounded-2xl border bg-card p-4 shadow-xs",
                    long && "border-red-300",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-12 min-w-12 shrink-0 items-center justify-center rounded-xl px-1.5 text-[20px] font-bold text-white",
                        order.tableLabel ? "bg-orange-500" : "bg-zinc-900",
                      )}
                    >
                      {order.tableLabel ?? (
                        <Icon name="bag" className="size-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-bold">
                        {order.tableLabel
                          ? t("table", { table: order.tableLabel })
                          : t("takeaway")}
                      </p>
                      <p className="text-[12.5px] text-muted-foreground tabular-nums">
                        #{order.number} · {formatTime(order.openedAt, timeZone)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums",
                        long
                          ? "bg-red-100 text-red-700"
                          : "bg-zinc-100 text-zinc-600",
                      )}
                    >
                      <Icon name="clock" className="size-3.5" />
                      {span(minutes)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[11.5px] font-bold tracking-wide text-muted-foreground uppercase">
                        {t("dueLabel")}
                      </p>
                      <p className="text-[24px] leading-tight font-bold tabular-nums">
                        {formatTaka(order.dueTaka)}
                      </p>
                    </div>
                    {order.dueTaka !== order.totalTaka && (
                      <p className="text-[12.5px] text-muted-foreground tabular-nums">
                        {t("ofTotal", { total: formatTaka(order.totalTaka) })}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      href={orderHref(order.id)}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 text-[13.5px] font-semibold hover:border-zinc-900 hover:bg-zinc-50"
                    >
                      <Icon name="list" className="size-4" />
                      {t("view")}
                    </Link>
                    <Link
                      href={orderHref(order.id, "bill")}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-orange-600 text-[13.5px] font-semibold text-white hover:bg-orange-500"
                    >
                      <Icon name="cash" className="size-4" />
                      {t("bill")}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {closed.length > 0 && (
        <section aria-labelledby="closed-orders" className="space-y-3">
          <h2
            id="closed-orders"
            className="flex items-center gap-2 text-[17px] font-bold"
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full bg-emerald-600"
            />
            {t("closed")}
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[12.5px] font-bold text-zinc-600 tabular-nums">
              {closed.length}
            </span>
          </h2>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {closed.map((order) => {
              const cancelled = order.status === "cancelled";
              const took =
                order.closedAt !== null
                  ? Math.max(
                      0,
                      Math.round(
                        (new Date(order.closedAt).getTime() -
                          new Date(order.openedAt).getTime()) /
                          60000,
                      ),
                    )
                  : null;
              return (
                <li key={order.id}>
                  <Link
                    href={orderHref(
                      order.id,
                      cancelled ? undefined : "receipt",
                    )}
                    className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        cancelled
                          ? "bg-zinc-100 text-zinc-400"
                          : "bg-emerald-50 text-emerald-600",
                      )}
                    >
                      <Icon
                        name={cancelled ? "ban" : "checkCircle"}
                        className="size-5"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-[15px] font-semibold",
                          cancelled && "text-zinc-500",
                        )}
                      >
                        {order.tableLabel
                          ? t("table", { table: order.tableLabel })
                          : t("takeaway")}
                        <span className="ml-2 text-[13px] font-medium text-muted-foreground tabular-nums">
                          #{order.number}
                        </span>
                      </span>
                      <span className="block text-[12.5px] text-muted-foreground tabular-nums">
                        {formatTime(order.openedAt, timeZone)}
                        {order.closedAt &&
                          ` – ${formatTime(order.closedAt, timeZone)}`}
                        {took !== null && ` · ${span(took)}`}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "hidden rounded-full px-2.5 py-0.5 text-[12px] font-semibold sm:inline-block",
                        cancelled
                          ? "bg-zinc-100 text-zinc-500"
                          : "bg-emerald-50 text-emerald-700",
                      )}
                    >
                      {tStatus(order.status)}
                    </span>
                    <span
                      className={cn(
                        "w-24 shrink-0 text-right text-[15.5px] font-bold tabular-nums",
                        cancelled && "text-zinc-400 line-through",
                      )}
                    >
                      {formatTaka(order.totalTaka)}
                    </span>
                    <Icon
                      name="go"
                      className="size-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-900"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
