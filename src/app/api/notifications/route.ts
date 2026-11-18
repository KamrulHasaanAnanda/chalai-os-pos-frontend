import { callApi } from "@/lib/api-route";
import { notificationsFrom } from "@/lib/notifications";

/** The bell's list, worked out from the live floor (calls, QR orders, bills, food ready, bookings due). */
export async function GET() {
  return callApi(async (api) => notificationsFrom(await api.floor()));
}
