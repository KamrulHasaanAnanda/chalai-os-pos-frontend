import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReceiptView } from "@/components/views/receipt-view";
import { getReceipt } from "@/lib/data";
import { billRoles, requireStaff } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/orders/[id]/receipt">): Promise<Metadata> {
  const t = await getTranslations("receipt");
  const receipt = await getReceipt((await params).id);
  return { title: t("title", { number: receipt.billNumber }) };
}

export default async function ReceiptPage({ params }: PageProps<"/orders/[id]/receipt">) {
  const { id } = await params;
  const { restaurant } = await requireStaff({ roles: billRoles });
  const receipt = await getReceipt(id);
  return <ReceiptView receipt={receipt} timeZone={restaurant.timezone} />;
}
