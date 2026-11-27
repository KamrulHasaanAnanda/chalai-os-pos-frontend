import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ManagePromotionsView } from "@/components/views/manage-promotions-view";
import { load, requireManage } from "@/lib/session";
import { managerRoles } from "@/lib/roles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("promotions") };
}

/**
 * Promotions for the table menu and the website: the owner app's list. Deals change what orders are charged, so this
 * follows the menu grant (which already edits prices): managers always, others with `menu`.
 */
export default async function ManagePromotionsPage({ searchParams }: PageProps<"/manage/promotions">) {
  await requireManage("menu", managerRoles);
  const params = await searchParams;
  const tab = params.tab === "feedback" ? "feedback" : "list";
  const [promotions, feedback, menu] = await load((api) => Promise.all([api.promotions(), api.promotionFeedback(), api.menu()]));
  return <ManagePromotionsView promotions={promotions} feedback={feedback} menu={menu} tab={tab} />;
}
