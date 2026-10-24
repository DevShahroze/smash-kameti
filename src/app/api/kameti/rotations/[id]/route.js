import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { rotationPatchSchema } from "@/lib/validation/schemas";
import KametiRotation from "@/models/KametiRotation";
import { resyncOutingsForKametiRotation } from "@/lib/services/ledger";

export async function GET(_request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const rotation = await KametiRotation.findById(id).lean();
    if (!rotation) {
      return jsonError("Rotation not found", 404);
    }
    return jsonOk(rotation);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to load rotation", 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
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
    console.error(err);
    return jsonError("Failed to update rotation", 500);
  }
}
