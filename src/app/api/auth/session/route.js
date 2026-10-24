import { cookies } from "next/headers";
import { jsonOk } from "@/lib/api/http";
import { COOKIE_NAME, parseSessionToken } from "@/lib/auth/session";

export async function GET() {
  const cookieStore = await cookies();
  const session = await parseSessionToken(cookieStore.get(COOKIE_NAME)?.value);
  return jsonOk({ role: session?.role ?? null });
}
