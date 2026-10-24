import { cookies } from "next/headers";
import { jsonOk } from "@/lib/api/http";
import { COOKIE_NAME } from "@/lib/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return jsonOk({ loggedOut: true });
}
