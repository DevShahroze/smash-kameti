import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  parseSessionToken,
  ROLES,
} from "@/lib/auth/session";

export async function middleware(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = await parseSessionToken(token);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (request.method !== "GET" && session?.role !== ROLES.ADMIN) {
      return NextResponse.json(
        { ok: false, error: "Admin access required" },
        { status: 403 },
      );
    }
    return NextResponse.next();
  }

  if (pathname === "/login" && session?.role === ROLES.ADMIN) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
