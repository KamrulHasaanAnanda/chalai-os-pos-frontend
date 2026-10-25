"use server";

import { refresh } from "next/cache";
import { act, kitchenRoles, requireStaff } from "@/lib/session";

/** Start / Ready on a kitchen ticket. Returns an error code for the board to show, or null. */
export async function setTicketStatus(roundId: string, status: "preparing" | "ready"): Promise<string | null> {
  await requireStaff({ roles: kitchenRoles, module: "kitchen" });
  if (status !== "preparing" && status !== "ready") return "unknown";
  const result = await act((api) => api.setTicketStatus(String(roundId).slice(0, 64), status));
  refresh();
  return result.ok ? null : result.error.code;
}
