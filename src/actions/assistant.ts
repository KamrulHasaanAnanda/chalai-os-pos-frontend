"use server";

import { buildSnapshot } from "@/lib/assistant";
import { businessDate } from "@/lib/format";
import { act } from "@/lib/session";

/** Floor, today's orders, the kitchen queue and the menu, for the Chalai bot. */
export async function assistantSnapshot() {
  const result = await act(async (api) => {
    const me = await api.me();
    if (!me.restaurant) return null;
    const date = businessDate(me.restaurant.timezone);
    const [floor, orders, tickets, menu] = await Promise.all([
      api.floor().catch(() => null),
      api.orders({ date }).catch(() => null),
      api.tickets().catch(() => null),
      api.menu().catch(() => null),
    ]);
    return buildSnapshot({
      restaurant: me.restaurant.name,
      floor,
      orders,
      tickets,
      menu,
    });
  });
  return result.ok ? result.data : null;
}
