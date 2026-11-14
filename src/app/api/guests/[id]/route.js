import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { guestSchema } from "@/lib/validation/schemas";
import Guest from "@/models/Guest";
import Outing from "@/models/Outing";
import ExpenseAllocation from "@/models/ExpenseAllocation";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import {
  isInvalidParamError,
  resolveRouteObjectId,
} from "@/lib/security/route-id";

export async function PATCH(request, { params }) {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  try {
    await connectDB();
    const id = await resolveRouteObjectId(params);
    const body = await parseBody(request);
    const parsed = guestSchema.partial().safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }
    const guest = await Guest.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    }).lean();
    if (!guest) {
      return jsonError("Guest not found", 404);
    }
    return jsonOk(guest);
  } catch (err) {
    if (isInvalidParamError(err)) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to update guest", 500);
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
    const guest = await Guest.findById(id).lean();
    if (!guest) {
      return jsonError("Guest not found", 404);
    }
    const [outingUses, allocUses] = await Promise.all([
      Outing.countDocuments({ "guests.guestId": id }),
      ExpenseAllocation.countDocuments({
        participantKind: "guest",
        participantId: id,
      }),
    ]);
    if (outingUses > 0 || allocUses > 0) {
      return jsonError(
        "Guest is linked to past outings or expenses. Remove them from outings first, or leave the guest on the list.",
        409,
      );
    }
    await Guest.findByIdAndDelete(id);
    return jsonOk({ deleted: true });
  } catch (err) {
    if (isInvalidParamError(err)) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to delete guest", 500);
  }
}