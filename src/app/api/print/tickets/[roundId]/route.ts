import type { NextRequest } from "next/server";
import { callApi } from "@/lib/api-route";

/** The POS printed this KOT. `{ fallback: true }` when it printed by itself. Idempotent: a reprint changes nothing. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/print/tickets/[roundId]">) {
  const { roundId } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { fallback?: unknown };
  return callApi((api) => api.markPrinted(roundId.slice(0, 64), body.fallback === true));
}
