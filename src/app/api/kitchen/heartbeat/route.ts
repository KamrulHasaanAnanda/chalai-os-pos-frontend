import { callApi } from "@/lib/api-route";

/** The kitchen board on this device is showing tickets (sent every 10 s while visible). */
export async function POST() {
  return callApi((api) => api.kitchenHeartbeat());
}
