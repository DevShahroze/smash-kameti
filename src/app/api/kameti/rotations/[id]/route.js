import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { rotationPatchSchema } from "@/lib/validation/schemas";
import KametiRotation from "@/models/KametiRotation";
import KametiTurn from "@/models/KametiTurn";
import Outing from "@/models/Outing";
import { resyncOutingsForKametiRotation } from "@/lib/services/ledger";
import { enrichTurnWithBillStats } from "@/lib/services/kameti-bill-stats";
import {
  isInvalidParamError,
  resolveRouteObjectId,
} from "@/lib/security/route-id";
import { parseEnumParam } from "@/lib/security/sanitize";

export async function GET(request, { params }) {
  try {
    await connectDB();
    const id = await resolveRouteObjectId(params);
    const rotation = await KametiRotation.findById(id).lean();
    if (!rotation) {
      return jsonError("Rotation not found", 404);
    }
    const withTurns =
      parseEnumParam(
        request.nextUrl.searchParams.get("include"),
        ["turns"],
        "include",
      ) === "turns";
    if (!withTurns) {
      return jsonOk(rotation);
    }
    const turnsRaw = await KametiTurn.find({ rotationId: id })
      .sort({ turnNumber: 1 })
      .lean();
    const outingIds = turnsRaw
      .map((t) => t.outingId)
      .filter(Boolean);
    const outings = outingIds.length
      ? await Outing.find({ _id: { $in: outingIds } })
          .select("sharedBillPaisa parcels attendance")
          .lean()
      : [];
    const outingById = new Map(
      outings.map((o) => [String(o._id), o]),
    );
    const turns = turnsRaw.map((t) =>
      enrichTurnWithBillStats(t, outingById),
    );
    return jsonOk({ rotation, turns });
  } catch (err) {
    if (isInvalidParamError(err)) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to load rotation", 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const id = await resolveRouteObjectId(params);
    const body = await parseBody(request);
    const parsed = rotationPatchSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    const rotation = await KametiRotation.findById(id);
    if (!rotation) {
      return jsonError("Rotation not found", 404);
    }

    const settlementsIncludedChanged =
      parsed.data.settlementsIncluded !== undefined &&
      parsed.data.settlementsIncluded !== rotation.settlementsIncluded;

    if (parsed.data.settlementsIncluded !== undefined) {
      rotation.settlementsIncluded = parsed.data.settlementsIncluded;
    }

    if (parsed.data.active === true) {
      await KametiRotation.updateMany({ _id: { $ne: id } }, { active: false });
      rotation.active = true;
    } else if (parsed.data.active === false) {
      rotation.active = false;
    }

    await rotation.save();

    if (settlementsIncludedChanged) {
      await resyncOutingsForKametiRotation(id);
    }

    return jsonOk(rotation);
  } catch (err) {
    if (isInvalidParamError(err)) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to update rotation", 500);
  }
}
