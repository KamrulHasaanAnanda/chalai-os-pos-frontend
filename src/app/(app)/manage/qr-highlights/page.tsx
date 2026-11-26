import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ManageQrHighlightsView } from "@/components/views/manage-qr-highlights-view";
import { load, requireManage } from "@/lib/session";
import { managerRoles } from "@/lib/roles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("qrHighlights") };
}

export default async function ManageQrHighlightsPage() {
  await requireManage("qrHighlights", managerRoles);
  const [saved, menu] = await load((api) =>
    Promise.all([api.manageQrHighlights(), api.menu()]),
  );
  return <ManageQrHighlightsView saved={saved} menu={menu} />;
}