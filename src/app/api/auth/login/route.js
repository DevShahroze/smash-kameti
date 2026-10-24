import { cookies } from "next/headers";
import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { authenticateAdmin } from "@/lib/auth/admin-auth";
import {
  COOKIE_NAME,
  createSessionToken,
  MAX_AGE_SEC,
  ROLES,
} from "@/lib/auth/session";

export async function POST(request) {
  await connectDB();
  const body = await parseBody(request);
  const mode = body?.mode;

  if (mode === "guest") {
    const token = await createSessionToken(ROLES.GUEST);
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SEC,
    });
    return jsonOk({ role: ROLES.GUEST });
  }

  if (mode === "admin") {
    const email = body?.email;
    const password = body?.password;
    const admin = await authenticateAdmin(email, password);
    if (!admin) {
      return jsonError("Invalid email or password", 401);
    }
    const token = await createSessionToken(ROLES.ADMIN);
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SEC,
    });
    return jsonOk({ role: ROLES.ADMIN, email: admin.email });
  }

  return jsonError("Invalid login mode", 400);
}
