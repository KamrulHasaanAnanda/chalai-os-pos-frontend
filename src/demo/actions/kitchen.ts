// Frontend-only demo: browser version of src/actions/kitchen.ts (next.config.ts aliases it).
import { act, demoApi } from "@/demo/api";

/** Start / Ready on a kitchen ticket. Returns an error code for the board to show, or null. */
export async function setTicketStatus(roundId: string, status: "preparing" | "ready"): Promise<string | null> {
  if (status !== "preparing" && status !== "ready") return "unknown";
  const result = act(() => demoApi.setTicketStatus(String(roundId).slice(0, 64), status));
  return result.ok ? null : result.error.code;
}
