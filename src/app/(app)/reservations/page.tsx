import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReservationsView } from "@/components/views/reservations-view";
import { businessDate } from "@/lib/format";
import { canManageReservations } from "@/lib/roles";
import { floorRoles, load, requireStaff } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("reservations") };
}

/** One day's bookings for this branch. Everyone on the floor can see them; managers and granted staff change them. */
export default async function ReservationsPage({ searchParams }: PageProps<"/reservations">) {
  const { user } = await requireStaff({ roles: floorRoles });
  const params = await searchParams;
  // Bookings are always in Dhaka time (reservations spec), whatever the restaurant's display zone.
  const today = businessDate("Asia/Dhaka");
  const date = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today;
  const [day, floor] = await Promise.all([load((api) => api.reservations(date)), load((api) => api.floor())]);
  const areas = floor.areas.map((a) => ({ id: a.id, name: a.name, tables: a.tables.map((tb) => ({ id: tb.id, label: tb.label, seats: tb.seats })) }));
  return <ReservationsView day={day} date={date} today={today} areas={areas} canManage={canManageReservations(user)} />;
}
