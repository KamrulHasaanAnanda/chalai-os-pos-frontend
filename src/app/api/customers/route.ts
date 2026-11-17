import type { NextRequest } from "next/server";
import { callApi } from "@/lib/api-route";

/** A customer by exact phone, for the bill's lookup. */
export async function GET(request: NextRequest) {
  const phone = (request.nextUrl.searchParams.get("phone") ?? "").slice(0, 20);
  return callApi((api) => api.findCustomer(phone));
}
