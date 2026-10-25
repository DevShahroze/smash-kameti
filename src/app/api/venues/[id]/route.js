import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { venueSchema } from "@/lib/validation/schemas";
import Venue from "@/models/Venue";
import { getVenueWithStats } from "@/lib/services/venue-stats";
import {
  isInvalidParamError,
  resolveRouteObjectId,
} from "@/lib/security/route-id";

export async function GET(_request, { params }) {
  try {
    await connectDB();
    const id = await resolveRouteObjectId(params);
    const venue = await Venue.findById(id).lean();
    if (!venue) {
      return jsonError("Venue not found", 404);
    }
    const stats = await getVenueWithStats(id);
    return jsonOk({ venue, ...stats });
  } catch (err) {
    if (isInvalidParamError(err)) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to load venue", 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const id = await resolveRouteObjectId(params);
    const body = await parseBody(request);
    const parsed = venueSchema.partial().safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }
    const venue = await Venue.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    }).lean();
    if (!venue) {
      return jsonError("Venue not found", 404);
    }
    return jsonOk(venue);
  } catch (err) {
    if (isInvalidParamError(err)) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to update venue", 500);
  }
}
