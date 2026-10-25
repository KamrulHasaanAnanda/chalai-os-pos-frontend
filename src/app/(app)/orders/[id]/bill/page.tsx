import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BillView } from "@/components/views/bill-view";
import { getOrder } from "@/lib/data";
import { readError } from "@/lib/errors";
import { billRoles, requireStaff } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/orders/[id]/bill">): Promise<Metadata> {
  const t = await getTranslations("bill");
  const order = await getOrder((await params).id);
  return { title: t("title", { number: order.number }) };
}

export default async function BillPage({ params, searchParams }: PageProps<"/orders/[id]/bill">) {
  const { id } = await params;
  const { user, restaurant } = await requireStaff({ roles: billRoles });
  const order = await getOrder(id);
  return <BillView order={order} user={user} timeZone={restaurant.timezone} error={await readError(searchParams)} />;
}
