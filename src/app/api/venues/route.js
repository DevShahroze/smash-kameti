import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { venueSchema } from "@/lib/validation/schemas";
import Venue from "@/models/Venue";
import Outing from "@/models/Outing";
import { OUTING_STATUS } from "@/lib/constants";
import { requireAdminApi } from "@/lib/auth/require-admin-api";

export async function GET() {
  try {
    await connectDB();
    const venues = await Venue.find().sort({ name: 1 }).lean();
    const stats = await Outing.aggregate([
      { $match: { status: OUTING_STATUS.COMPLETED, venueId: { $ne: null } } },
      {
        $group: {
          _id: "$venueId",
          visitCount: { $sum: 1 },
          totalBill: { $sum: "$sharedBillPaisa" },
          highest: { $max: "$sharedBillPaisa" },
          lowest: { $min: "$sharedBillPaisa" },
        },
      },
    ]);
    const statMap = Object.fromEntries(
      stats.map((s) => [
        String(s._id),
        {
          visitCount: s.visitCount,
          averageBillPaisa: s.visitCount
            ? Math.round(s.totalBill / s.visitCount)
            : 0,
          highestBillPaisa: s.highest,
          lowestBillPaisa: s.lowest,
        },
      ]),
    );
    const enriched = venues.map((v) => ({
      ...v,
      stats: statMap[String(v._id)] || {
        visitCount: 0,
        averageBillPaisa: 0,
        highestBillPaisa: 0,
        lowestBillPaisa: 0,
      },
    }));
    return jsonOk(enriched);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to load venues", 500);
  }
}

export async function POST(request) {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  try {
    await connectDB();
    const body = await parseBody(request);
    const parsed = venueSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }
    const venue = await Venue.create(parsed.data);
    return jsonOk(venue, 201);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to create venue", 500);
  }
}
