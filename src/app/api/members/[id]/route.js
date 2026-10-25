import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { memberSchema } from "@/lib/validation/schemas";
import Member from "@/models/Member";
import { getMemberDetail } from "@/lib/services/member-detail";
import {
  isInvalidParamError,
  resolveRouteObjectId,
} from "@/lib/security/route-id";

export async function GET(_request, { params }) {
  try {
    await connectDB();
    const id = await resolveRouteObjectId(params);
    const member = await Member.findById(id).lean();
    if (!member) {
      return jsonError("Member not found", 404);
    }
    const detail = await getMemberDetail(id);
    return jsonOk({ member, ...detail });
  } catch (err) {
    if (isInvalidParamError(err)) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to load member", 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const id = await resolveRouteObjectId(params);
    const body = await parseBody(request);
    const parsed = memberSchema.partial().safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }
    const member = await Member.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    }).lean();
    if (!member) {
      return jsonError("Member not found", 404);
    }
    return jsonOk(member);
  } catch (err) {
    if (isInvalidParamError(err)) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to update member", 500);
  }
}
