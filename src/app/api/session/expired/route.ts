import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

/** Pages can't change cookies while rendering, so a 401 seen there lands here: clear the session and log in again. */
// A relative Location: behind the production proxy `request.url` is the server's own address
// (http://localhost:3002), so an absolute URL built from it sent people to localhost.
export async function GET() {
  await clearSessionCookie();
  return new NextResponse(null, { status: 307, headers: { Location: "/login?error=session_expired" } });
}
