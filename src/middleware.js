import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  parseSessionToken,
  ROLES,
} from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { withSecurityHeaders } from "@/lib/security/headers";

function rateLimitedResponse(retryAfterSec) {
  return NextResponse.json(
    { ok: false, error: "Too many requests" },
    {
      status: 429,
      headers: withSecurityHeaders({
        "Retry-After": String(retryAfterSec),
      }),
    },
  );
}

export async function middleware(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = await parseSessionToken(token);
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  if (pathname.startsWith("/api/")) {
    const isAuth = pathname.startsWith("/api/auth/");
    const limit = isAuth ? 20 : 180;
    const windowMs = isAuth ? 60_000 : 60_000;
    const key = `${isAuth ? "auth" : "api"}:${ip}`;
    const rate = checkRateLimit(key, { limit, windowMs });
    if (!rate.allowed) {
      return rateLimitedResponse(rate.retryAfterSec);
    }
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (request.method !== "GET" && session?.role !== ROLES.ADMIN) {
      return NextResponse.json(
        { ok: false, error: "Admin access required" },
        { status: 403, headers: withSecurityHeaders() },
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
