import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { turnUpdateSchema } from "@/lib/validation/schemas";
import KametiTurn from "@/models/KametiTurn";
import Member from "@/models/Member";
import AuditLog from "@/models/AuditLog";
import { TURN_STATUS } from "@/lib/constants";
import {
  isInvalidParamError,
  resolveRouteObjectId,
} from "@/lib/security/route-id";

export async function GET(_request, { params }) {
  try {
    await connectDB();
    const id = await resolveRouteObjectId(params);
    const turn = await KametiTurn.findById(id).lean();
    if (!turn) {
      return jsonError("Turn not found", 404);
    }
    return jsonOk(turn);
  } catch (err) {
    if (isInvalidParamError(err)) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to load turn", 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const id = await resolveRouteObjectId(params);
    const body = await parseBody(request);
    const parsed = turnUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    const turn = await KametiTurn.findById(id);
    if (!turn) {
      return jsonError("Turn not found", 404);
    }

    const before = turn.toObject();

    if (parsed.data.memberId) {
      const member = await Member.findById(parsed.data.memberId).lean();
      if (!member) {
        return jsonError("Member not found", 400);
      }
      turn.memberId = member._id;
      turn.memberNameSnapshot = member.nickname || member.fullName;
    }

    if (parsed.data.status) {
      turn.status = parsed.data.status;
      if (parsed.data.status === TURN_STATUS.COMPLETED) {
        turn.completedAt = parsed.data.completedAt
          ? new Date(parsed.data.completedAt)
          : new Date();
      }
      if (parsed.data.status === TURN_STATUS.PENDING) {
        turn.completedAt = null;
      }
    }

    if (parsed.data.outingId !== undefined) {
      turn.outingId = parsed.data.outingId || null;
    }
    if (parsed.data.treatAmountPaisa !== undefined) {
      turn.treatAmountPaisa = parsed.data.treatAmountPaisa;
    }
    if (parsed.data.notes !== undefined) {
      turn.notes = parsed.data.notes;
    }

    await turn.save();

    await AuditLog.create({
      entityType: "kameti_turn",
      entityId: turn._id,
      action: "update",
      summary: `Turn ${turn.turnNumber} updated`,
      before,
      after: turn.toObject(),
    });

    return jsonOk(turn);
  } catch (err) {
    if (isInvalidParamError(err)) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to update turn", 500);
  }
}
