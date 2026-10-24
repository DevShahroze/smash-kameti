import { cookies } from "next/headers";
import { jsonError } from "@/lib/api/http";
import { COOKIE_NAME, isAdminRole, parseSessionToken } from "@/lib/auth/session";

export async function requireAdminApi() {
  const cookieStore = await cookies();
  const session = await parseSessionToken(cookieStore.get(COOKIE_NAME)?.value);
  if (!isAdminRole(session)) {
    return jsonError("Admin access required", 403);
  }
  return null;
}
