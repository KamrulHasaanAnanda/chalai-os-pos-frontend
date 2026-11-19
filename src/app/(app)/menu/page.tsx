import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MenuView } from "@/components/views/menu-view";
import { readError } from "@/lib/errors";
import { load, managerRoles, requireManage } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("menu");
  return { title: t("title") };
}

export default async function MenuPage({ searchParams }: PageProps<"/menu">) {
  // Managers always; other roles when the owner granted Menu.
  await requireManage("menu", managerRoles);
  const menu = await load((api) => api.menu());
  return <MenuView menu={menu} error={await readError(searchParams)} />;
}
