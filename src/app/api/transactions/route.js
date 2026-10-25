import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError } from "@/lib/api/http";
import { TRANSACTION_TYPES } from "@/lib/constants";
import Transaction from "@/models/Transaction";
import Outing from "@/models/Outing";
import { parseEnumParam, parseObjectId } from "@/lib/security/sanitize";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const filter = {};
    const type = parseEnumParam(
      searchParams.get("type"),
      Object.values(TRANSACTION_TYPES),
      "type",
    );
    if (type) {
      filter.type = type;
    }
    const memberId = parseObjectId(searchParams.get("memberId"), "memberId");
    if (memberId) {
      filter.$or = [{ payerId: memberId }, { recipientId: memberId }];
    }
    const outingId = parseObjectId(searchParams.get("outingId"), "outingId");
    if (outingId) {
      filter.outingId = outingId;
    }

    const transactions = await Transaction.find(filter)
      .sort({ transactionDate: -1 })
      .lean();

    const outingIds = [
      ...new Set(
        transactions
          .map((t) => t.outingId)
          .filter(Boolean)
          .map((id) => String(id)),
      ),
    ];
    const outings = outingIds.length
      ? await Outing.find({ _id: { $in: outingIds } })
          .select(
            "weekNumber venueNameSnapshot paymentSystem status actualDate scheduledDate",
          )
          .lean()
      : [];
    const outingById = new Map(outings.map((o) => [String(o._id), o]));

    const enriched = transactions.map((t) => ({
      ...t,
      outing: t.outingId
        ? outingById.get(String(t.outingId)) || null
        : null,
    }));

    return jsonOk(enriched);
  } catch (err) {
    if (err?.message?.startsWith("Invalid ")) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to load transactions", 500);
  }
}
