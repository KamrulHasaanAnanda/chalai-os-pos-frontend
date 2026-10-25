import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { orderStatuses, OrdersView } from "@/components/views/orders-view";
import { businessDate } from "@/lib/format";
import { floorRoles, load, requireStaff } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("orders");
  return { title: t("title") };
}

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const { restaurant } = await requireStaff({ roles: floorRoles });
  const params = await searchParams;
  const tz = restaurant.timezone;
  const today = businessDate(tz);
  const date = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today;
  const status = orderStatuses.find((s) => s === params.status);
  const orders = await load((api) => api.orders({ status, date }));
  return <OrdersView orders={orders} status={status} date={date} today={today} timeZone={tz} />;
}
