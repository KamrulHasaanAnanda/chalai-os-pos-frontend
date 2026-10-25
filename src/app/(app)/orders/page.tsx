import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { fieldClass, Notice, PageTitle } from "@/components/form";
import { Chip } from "@/components/status";
import { buttonVariants } from "@/components/ui/button-variants";
import type { OrderStatus } from "@/lib/api/types";
import { businessDate, formatTaka, formatTime } from "@/lib/format";
import { floorRoles, load, requireStaff } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("orders");
  return { title: t("title") };
}

const statuses: OrderStatus[] = ["open", "paid", "cancelled"];

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const { restaurant } = await requireStaff({ roles: floorRoles });
  const params = await searchParams;
  const tz = restaurant.timezone;
  const today = businessDate(tz);
  const date = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today;
  const status = statuses.find((s) => s === params.status);
  const orders = await load((api) => api.orders({ status, date }));
  const t = await getTranslations("orders");
  const tOrder = await getTranslations("order");
  const tStatus = await getTranslations("orderStatus");

  const href = (next: { status?: OrderStatus; date?: string }) => {
    const search = new URLSearchParams();
    if (next.status) search.set("status", next.status);
    if (next.date && next.date !== today) search.set("date", next.date);
    return search.size ? `/orders?${search}` : "/orders";
  };
  const counted = orders.filter((o) => o.status !== "cancelled");
  const total = counted.reduce((sum, o) => sum + o.totalTaka, 0);
  const due = orders.filter((o) => o.status === "open").reduce((sum, o) => sum + o.dueTaka, 0);

  return (
    <div className="mx-auto max-w-[960px] space-y-4">
      <PageTitle title={date === today ? t("titleToday") : t("titleDate", { date })} />

      <div className="flex flex-wrap items-end gap-3">
        <nav aria-label={t("filter")} className="flex flex-wrap gap-2">
          {[undefined, ...statuses].map((s) => (
            <Link
              key={s ?? "all"}
              href={href({ status: s, date })}
              aria-current={s === status ? "page" : undefined}
              className={cn(
                "flex min-h-12 items-center rounded-full px-4 text-[15.5px] font-bold",
                s === status ? "bg-maroon text-white" : "bg-white shadow-[inset_0_0_0_2px_var(--line)]",
              )}
            >
              {s ? tStatus(s) : t("all")}
            </Link>
          ))}
        </nav>
        <form method="get" action="/orders" className="flex items-end gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label className="block text-[14.5px] font-bold">
            {t("date")}
            <input type="date" name="date" defaultValue={date} max={today} className={cn(fieldClass, "min-h-12")} />
          </label>
          <button type="submit" className={buttonVariants({ variant: "soft", size: "pillSm" })}>
            {t("show")}
          </button>
        </form>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {[
          { label: t("count"), value: String(orders.length) },
          { label: t("total"), value: formatTaka(total) },
          { label: t("due"), value: formatTaka(due) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-white p-3 shadow-[inset_0_0_0_2px_var(--line)]">
            <dt className="text-[13.5px] font-bold text-muted-foreground">{stat.label}</dt>
            <dd className="text-[20px] font-extrabold tabular-nums sm:text-[24px]">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {orders.length === 0 ? (
        <Notice tone="info">{t("empty")}</Notice>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-[inset_0_0_0_2px_var(--line)]">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className="flex min-h-[64px] items-center gap-3 px-4 py-2 hover:bg-gray/50">
                <span className="w-14 shrink-0 text-[17px] font-extrabold tabular-nums">#{order.number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16.5px] font-bold">
                    {order.tableLabel ? tOrder("table", { table: order.tableLabel }) : tOrder("takeaway")}
                  </span>
                  <span className="block text-[14px] text-muted-foreground">
                    {formatTime(order.openedAt, tz)}
                    {order.closedAt && ` – ${formatTime(order.closedAt, tz)}`}
                  </span>
                </span>
                <Chip tone={order.status === "open" ? "warn" : order.status === "paid" ? "ok" : "late"}>{tStatus(order.status)}</Chip>
                <span className="w-24 shrink-0 text-right">
                  <span className={cn("block font-extrabold tabular-nums", order.status === "cancelled" && "line-through opacity-60")}>
                    {formatTaka(order.totalTaka)}
                  </span>
                  {order.status === "open" && order.dueTaka > 0 && (
                    <span className="block text-[13px] font-bold text-late tabular-nums">{t("dueShort", { amount: formatTaka(order.dueTaka) })}</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
