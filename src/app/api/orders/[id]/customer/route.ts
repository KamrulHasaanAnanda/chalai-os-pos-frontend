import type { NextRequest } from "next/server";
import { callApi } from "@/lib/api-route";

/** Puts a customer on the open bill (made if the phone is new). */
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/orders/[id]/customer">) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; phone?: unknown };
  return callApi((api) => api.attachCustomer(id.slice(0, 64), String(body.name ?? "").slice(0, 80), String(body.phone ?? "").slice(0, 20)));
}

/** Takes the customer off the open bill; the customer stays. */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/orders/[id]/customer">) {
  const { id } = await ctx.params;
  return callApi((api) => api.detachCustomer(id.slice(0, 64)));
}
