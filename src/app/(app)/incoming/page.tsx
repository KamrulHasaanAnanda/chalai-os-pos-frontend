import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { IncomingView } from "@/components/views/incoming-view";
import { readError } from "@/lib/errors";
import { incomingFrom, incomingOrderIds } from "@/lib/incoming";
import { floorRoles, load, requireStaff } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("incoming");
  return { title: t("title") };
}

export default async function IncomingPage({ searchParams }: PageProps<"/incoming">) {
  const { user, restaurant } = await requireStaff({ roles: floorRoles });
  // The floor says which tables have something waiting; only those orders are loaded, in parallel.
  const floor = await load((api) => api.floor());
  const orders = await Promise.all(incomingOrderIds(floor).map((id) => load((api) => api.order(id))));
  return (
    <IncomingView incoming={incomingFrom(orders)} user={user} timeZone={restaurant.timezone} error={await readError(searchParams)} />
  );
}
