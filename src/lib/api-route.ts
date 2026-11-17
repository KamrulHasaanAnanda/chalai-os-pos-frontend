import "server-only";
import { NextResponse } from "next/server";
import { ApiError, apiFor, type SessionApi } from "@/lib/api/client";
import { clearSessionCookie, sessionToken } from "@/lib/session";

/**
 * For route handlers the browser calls with fetch (printing, kitchen heartbeat): one API call with the session
 * cookie's token, answered as JSON. The token never leaves the server. API errors keep their status and code.
 */
export async function callApi<T>(fn: (api: SessionApi) => Promise<T>): Promise<NextResponse> {
  const token = await sessionToken();
  if (!token) return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json((await fn(apiFor(token))) ?? null, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.statusCode === 401) await clearSessionCookie();
      return NextResponse.json({ code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ code: "unknown" }, { status: 500 });
  }
}
