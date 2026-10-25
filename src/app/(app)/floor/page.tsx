import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FloorView } from "@/components/views/floor-view";
import { readError } from "@/lib/errors";
import { floorRoles, load, requireStaff } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("floor");
  return { title: t("title") };
}

export default async function FloorPage({ searchParams }: PageProps<"/floor">) {
  const { user } = await requireStaff({ roles: floorRoles });
  const floor = await load((api) => api.floor());
  return <FloorView floor={floor} user={user} error={await readError(searchParams)} />;
}
