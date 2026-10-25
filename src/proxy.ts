import { NextResponse, type NextRequest } from "next/server";

/** Optimistic check only: no session cookie means log in. Pages still verify the session with GET /auth/me. */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("chalai_pos_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!login|api|_next|brand|icon.svg|favicon.ico).*)"],
};
