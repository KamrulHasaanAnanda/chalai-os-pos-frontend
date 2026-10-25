import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OrderView } from "@/components/views/order-view";
import { getOrder } from "@/lib/data";
import { readError } from "@/lib/errors";
import { floorRoles, load, requireStaff } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/orders/[id]">): Promise<Metadata> {
  const t = await getTranslations("order");
  const order = await getOrder((await params).id);
  return { title: t("title", { number: order.number }) };
}

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const { user, restaurant } = await requireStaff({ roles: floorRoles });
  const order = await getOrder(id);
  // The menu is only needed while items can still be added.
  const menu = order.status === "open" ? await load((api) => api.menu()) : null;
  return <OrderView order={order} menu={menu} user={user} timeZone={restaurant.timezone} error={await readError(searchParams)} />;
}
