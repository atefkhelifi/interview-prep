import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: sends signed-out visitors to /login without a DB hit.
// Real authorization happens in requireUser() and in every server action.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/study/:path*", "/workshops/:path*", "/interview/:path*"],
};
