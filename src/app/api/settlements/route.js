import { cookies } from "next/headers";
import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError } from "@/lib/api/http";
import { getSettlementLedger } from "@/lib/services/ledger";
import {
  COOKIE_NAME,
  isAdminRole,
  parseSessionToken,
} from "@/lib/auth/session";

export async function GET(request) {
  try {
    await connectDB();
    const cookieStore = await cookies();
    const session = await parseSessionToken(
      cookieStore.get(COOKIE_NAME)?.value,
    );
    const forceSync =
      request.nextUrl.searchParams.get("sync") === "1" &&
      isAdminRole(session);
    const ledger = await getSettlementLedger({ resync: forceSync });
    return jsonOk(ledger);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to load settlements", 500);
  }
}
