import { NextResponse, type NextRequest } from "next/server";

/** Optimistic check only: no session cookie means log in. Pages still verify the session with GET /auth/me. */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("chalai_pos_session")) {
    // Built from the host the browser used: behind the production proxy request.url is the server's own
    // address (http://localhost:3002), which sent people to localhost.
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
    return NextResponse.redirect(host ? new URL("/login", `${proto}://${host}`) : new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!login|api|_next|brand|icons|icon.svg|favicon.ico|sw.js|manifest.webmanifest).*)"],
};
