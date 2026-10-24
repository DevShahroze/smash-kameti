import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError } from "@/lib/api/http";
import { getSettlementLedger } from "@/lib/services/ledger";

export async function GET() {
  try {
    await connectDB();
    const ledger = await getSettlementLedger();
    return jsonOk(ledger);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to load settlements", 500);
  }
}
