import { NextResponse } from "next/server";
import { ApiError, apiFor } from "@/lib/api/client";
import { clearSessionCookie, sessionToken } from "@/lib/session";

/**
 * The browser's only way to get a one-time Socket.IO ticket (spec §11). The session token never leaves the server;
 * the ticket is single use and expires in 60 s.
 */
export async function GET() {
  const token = await sessionToken();
  if (!token) return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  try {
    const { ticket, expiresAt } = await apiFor(token).realtimeTicket();
    return NextResponse.json({ ticket, expiresAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.statusCode === 401) await clearSessionCookie();
      return NextResponse.json({ code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ code: "unknown" }, { status: 500 });
  }
}
