import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { outingSchema } from "@/lib/validation/schemas";
import Outing from "@/models/Outing";
import { deleteOuting, updateOuting } from "@/lib/services/outing-service";
import {
  isInvalidParamError,
  resolveRouteObjectId,
} from "@/lib/security/route-id";

export async function GET(_request, { params }) {
  try {
    await connectDB();
    const id = await resolveRouteObjectId(params);
    const outing = await Outing.findById(id).lean();
    if (!outing) {
      return jsonError("Outing not found", 404);
    }
    return jsonOk(outing);
  } catch (err) {
    if (isInvalidParamError(err)) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to load outing", 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const id = await resolveRouteObjectId(params);
    const body = await parseBody(request);
    const parsed = outingSchema.partial().safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }
    const existing = await Outing.findById(id).lean();
    if (!existing) {
      return jsonError("Outing not found", 404);
    }
    const merged = {
      ...existing,
      ...parsed.data,
      venueId: parsed.data.venueId ?? (existing.venueId ? String(existing.venueId) : null),
      kametiTurnId:
        parsed.data.kametiTurnId ??
        (existing.kametiTurnId ? String(existing.kametiTurnId) : null),
      hostMemberId:
        parsed.data.hostMemberId ??
        (existing.hostMemberId ? String(existing.hostMemberId) : null),
    };
    const outing = await updateOuting(id, merged);
    if (!outing) {
      return jsonError("Outing not found", 404);
    }
    return jsonOk(outing);
  } catch (err) {
    if (isInvalidParamError(err)) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to update outing", 500);
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const id = await resolveRouteObjectId(params);
    const body = await parseBody(request);
    const parsed = outingSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }
    const outing = await updateOuting(id, parsed.data);
    if (!outing) {
      return jsonError("Outing not found", 404);
    }
    return jsonOk(outing);
  } catch (err) {
    if (isInvalidParamError(err)) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to update outing", 500);
  }
}

export async function DELETE(_request, { params }) {
  try {
    await connectDB();
    const id = await resolveRouteObjectId(params);
    const result = await deleteOuting(id);
    if (!result) {
      return jsonError("Outing not found", 404);
    }
    return jsonOk(result);
  } catch (err) {
    if (isInvalidParamError(err)) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to delete outing", 500);
  }
}
