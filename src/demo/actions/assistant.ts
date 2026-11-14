// Frontend-only demo: browser version of src/actions/assistant.ts (next.config.ts aliases it).
import { buildSnapshot } from "@/lib/assistant";
import { businessDate } from "@/lib/format";
import { floor, getState, orderSummaries, tickets } from "@/demo/store";

/** The demo restaurant on this device, for the Chalai bot. */
export async function assistantSnapshot() {
  const state = getState();
  if (!state.sessionUserId) return null;
  return buildSnapshot({
    restaurant: state.restaurant.name,
    floor: floor(state),
    orders: orderSummaries(state, { date: businessDate(state.restaurant.timezone) }),
    tickets: tickets(state),
    menu: state.menu,
  });
}
