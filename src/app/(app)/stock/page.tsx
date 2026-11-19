import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StockView } from "@/components/views/stock-view";
import { load, requireStaff } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("stock") };
}

/** This branch's goods (stock spec): counts, expiry and running-out flags. Read-only, except sending for granted managers. */
export default async function StockPage() {
  const { user, restaurant } = await requireStaff();
  const canSend =
    restaurant.modules.includes("multi_branch") && (user.role === "owner" || (user.role === "manager" && user.permissions?.stock === true));
  const [goods, branches] = await Promise.all([
    load((api) => api.stock()),
    canSend ? load((api) => api.stockBranches()) : Promise.resolve([]),
  ]);
  return <StockView goods={goods} branches={branches} canSend={canSend && branches.length > 0} />;
}
