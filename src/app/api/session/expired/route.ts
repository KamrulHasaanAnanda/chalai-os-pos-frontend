import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/session";

/** Pages can't change cookies while rendering, so a 401 seen there lands here: clear the session and log in again. */
export async function GET(request: NextRequest) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login?error=session_expired", request.url));
}
