import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { venueSchema } from "@/lib/validation/schemas";
import Venue from "@/models/Venue";
import Outing from "@/models/Outing";
import { getVenueWithStats } from "@/lib/services/venue-stats";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import {
  isInvalidParamError,
  resolveRouteObjectId,
} from "@/lib/security/route-id";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
    if (parsed.data.name !== undefined) {
      const trimmed = parsed.data.name.trim();
      const duplicate = await Venue.findOne({
        _id: { $ne: id },
        name: new RegExp(`^${escapeRegex(trimmed)}$`, "i"),
      }).lean();
      if (duplicate) {
        return jsonError("A venue with this name already exists", 409);
      }
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

export async function DELETE(_request, { params }) {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  try {
    await connectDB();
    const id = await resolveRouteObjectId(params);
    const venue = await Venue.findById(id).lean();
    if (!venue) {
      return jsonError("Venue not found", 404);
    }
    const visitCount = await Outing.countDocuments({ venueId: id });
    if (visitCount > 0) {
      return jsonError(
        "Cannot delete a venue that has outings linked to it",
        409,
      );
    }
    await Venue.findByIdAndDelete(id);
    return jsonOk({ deleted: true });
  } catch (err) {
    if (isInvalidParamError(err)) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to delete venue", 500);
  }
}
