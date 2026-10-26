import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE, pickLocale } from "@/lib/i18n";

const PROTECTED = ["/dashboard", "/study", "/hr", "/cv", "/workshops", "/interview"];

// Pages live under app/[lang]. URLs stay unprefixed: the language comes from the cookie
// (or the browser) and the request is rewritten to /en/... or /fr/....
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // A prefixed link (/fr/dashboard) picks that language, then drops the prefix.
  const prefix = pathname.split("/")[1];
  if (isLocale(prefix)) {
    const url = new URL(pathname.slice(prefix.length + 1) || "/", request.url);
    url.search = search;
    const response = NextResponse.redirect(url);
    response.cookies.set(LOCALE_COOKIE, prefix, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return response;
  }

  // Optimistic check only: sends signed-out visitors to /login without a DB hit.
  // Real authorization happens in requireUser() and in every server action.
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const locale = pickLocale(request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Everything except API routes, Next internals and files (favicon.ico, images…).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
