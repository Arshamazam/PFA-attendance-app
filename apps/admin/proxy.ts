import { NextRequest, NextResponse } from "next/server";

const PUBLIC = new Set(["/login"]);

// Optimistic check: the cookie name is set in auth.ts as "admin.session-token"
const SESSION_COOKIE = "admin.session-token";

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC.has(pathname);
  const isLoggedIn = !!req.cookies.get(SESSION_COOKIE)?.value;

  if (!isPublic && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isPublic && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.png|.*\\.svg|.*\\.ico).*)"],
};
