import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { KitchenBoard } from "@/components/kitchen-board";
import { kitchenRoles, load, requireStaff } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("kitchen");
  return { title: t("title") };
}

export default async function KitchenPage() {
  await requireStaff({ roles: kitchenRoles, module: "kitchen" });
  const tickets = await load((api) => api.tickets());
  return <KitchenBoard tickets={tickets} />;
}
