import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const isSuperAdmin = session?.user?.role === "super_admin";
  const isLoginPage = nextUrl.pathname === "/login";
  const isSsoPage = nextUrl.pathname === "/sso";

  // Allow SSO receiver without auth — it establishes the session itself
  if (isSsoPage) return NextResponse.next();

  if (isLoginPage) {
    if (isLoggedIn && isSuperAdmin) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn || !isSuperAdmin) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
