import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { outingSchema } from "@/lib/validation/schemas";
import Outing from "@/models/Outing";
import { createOuting } from "@/lib/services/outing-service";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const filter = {};
    if (searchParams.get("weekNumber")) {
      filter.weekNumber = Number(searchParams.get("weekNumber"));
    }
    if (searchParams.get("paymentSystem")) {
      filter.paymentSystem = searchParams.get("paymentSystem");
    }
    if (searchParams.get("status")) {
      filter.status = searchParams.get("status");
    }
    if (searchParams.get("venueId")) {
      filter.venueId = searchParams.get("venueId");
    }
    if (searchParams.get("memberId")) {
      const memberId = searchParams.get("memberId");
      filter.$or = [
        { hostMemberId: memberId },
        { "attendance.memberId": memberId },
        { "chargeableParticipants.refId": memberId },
      ];
    }

    const outings = await Outing.find(filter)
      .sort({ weekNumber: -1, actualDate: -1 })
      .lean();
    return jsonOk(outings);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to load outings", 500);
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await parseBody(request);
    const parsed = outingSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }
    const outing = await createOuting(parsed.data);
    return jsonOk(outing, 201);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to create outing", 500);
  }
}
