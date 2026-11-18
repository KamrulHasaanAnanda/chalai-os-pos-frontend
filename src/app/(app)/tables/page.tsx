import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TablesView } from "@/components/views/floor-view";
import { readError } from "@/lib/errors";
import { floorRoles, load, requireStaff } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("tables") };
}

/** Every table in the branch, by area. Floor keeps the overview and the busy tables. */
export default async function TablesPage({
  searchParams,
}: PageProps<"/tables">) {
  await requireStaff({ roles: floorRoles });
  const floor = await load((api) => api.floor());
  return <TablesView floor={floor} error={await readError(searchParams)} />;
}
