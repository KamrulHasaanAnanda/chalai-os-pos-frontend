import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OrdersView } from "@/components/views/orders-view";
import { readError } from "@/lib/errors";
import { businessDate } from "@/lib/format";
import { act, floorRoles, load, requireStaff } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("orders");
  return { title: t("title") };
}

/** An order open longer than this is "stale": shown apart, left out of the day's list and numbers. */
const STALE_HOURS = (() => {
  const hours = Number(process.env.CHALAI_STALE_HOURS);
  return Number.isFinite(hours) && hours > 0 ? hours : 12;
})();

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const { user, restaurant } = await requireStaff({ roles: floorRoles });
  const params = await searchParams;
  const tz = restaurant.timezone;
  const today = businessDate(tz);
  const date = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today;
  // Every status at once: the filter tabs show counts and filter in the browser.
  const orders = await load((api) => api.orders({ date }));
  // ?view=<id> opens that order in the side drawer.
  const viewId = typeof params.view === "string" ? params.view.slice(0, 64) : undefined;
  const viewed = viewId ? await act((api) => api.order(viewId)) : null;
  return (
    <OrdersView
      orders={orders}
      date={date}
      today={today}
      timeZone={tz}
      user={user}
      staleHours={STALE_HOURS}
      viewed={viewed ? (viewed.ok ? viewed.data : "error") : null}
      error={await readError(searchParams)}
    />
  );
}
