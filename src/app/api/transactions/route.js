import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError } from "@/lib/api/http";
import Transaction from "@/models/Transaction";
import Outing from "@/models/Outing";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const filter = {};
    if (searchParams.get("type")) {
      filter.type = searchParams.get("type");
    }
    if (searchParams.get("memberId")) {
      const memberId = searchParams.get("memberId");
      filter.$or = [{ payerId: memberId }, { recipientId: memberId }];
    }
    if (searchParams.get("outingId")) {
      filter.outingId = searchParams.get("outingId");
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
    console.error(err);
    return jsonError("Failed to load transactions", 500);
  }
}
