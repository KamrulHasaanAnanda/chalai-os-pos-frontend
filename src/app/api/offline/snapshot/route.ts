import { callApi } from "@/lib/api-route";

/**
 * What the till needs to keep working offline (pos-offline spec): who is signed in, the restaurant's bill settings,
 * the floor, the menu, the open orders on it, and the versions /pos/sync reports. The browser stores it in IndexedDB.
 */
export async function GET() {
  return callApi(async (api) => {
    const [me, floor, menu, sync] = await Promise.all([api.me(), api.floor(), api.menu(), api.sync().catch(() => null)]);
    const openIds = floor.areas.flatMap((a) => a.tables.flatMap((t) => (t.order ? [t.order.id] : [])));
    const orders = await Promise.all(openIds.map((id) => api.order(id).catch(() => null)));
    return { savedAt: new Date().toISOString(), me, floor, menu, orders: orders.filter(Boolean), sync };
  });
}
