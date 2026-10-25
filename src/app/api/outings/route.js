import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { outingSchema } from "@/lib/validation/schemas";
import { OUTING_STATUS, PAYMENT_SYSTEMS } from "@/lib/constants";
import Outing from "@/models/Outing";
import { createOuting } from "@/lib/services/outing-service";
import {
  parseEnumParam,
  parseObjectId,
  parsePositiveIntParam,
} from "@/lib/security/sanitize";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const filter = {};
    const weekNumber = parsePositiveIntParam(
      searchParams.get("weekNumber"),
      "weekNumber",
    );
    if (weekNumber) {
      filter.weekNumber = weekNumber;
    }
    const paymentSystem = parseEnumParam(
      searchParams.get("paymentSystem"),
      [PAYMENT_SYSTEMS.KAMETI, PAYMENT_SYSTEMS.AMERICAN],
      "paymentSystem",
    );
    if (paymentSystem) {
      filter.paymentSystem = paymentSystem;
    }
    const status = parseEnumParam(
      searchParams.get("status"),
      Object.values(OUTING_STATUS),
      "status",
    );
    if (status) {
      filter.status = status;
    }
    const venueId = parseObjectId(searchParams.get("venueId"), "venueId");
    if (venueId) {
      filter.venueId = venueId;
    }
    const memberId = parseObjectId(searchParams.get("memberId"), "memberId");
    if (memberId) {
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
    if (err?.message?.startsWith("Invalid ")) {
      return jsonError(err.message, 400);
    }
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
