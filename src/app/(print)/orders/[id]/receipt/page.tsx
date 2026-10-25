import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReceiptView } from "@/components/views/receipt-view";
import { getOrder } from "@/lib/data";
import { billRoles, requireStaff } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/orders/[id]/receipt">): Promise<Metadata> {
  const t = await getTranslations("receipt");
  const order = await getOrder((await params).id);
  return { title: t("title", { number: order.number }) };
}

export default async function ReceiptPage({ params }: PageProps<"/orders/[id]/receipt">) {
  const { id } = await params;
  const { restaurant } = await requireStaff({ roles: billRoles });
  const order = await getOrder(id);
  return <ReceiptView order={order} restaurant={restaurant} />;
}
