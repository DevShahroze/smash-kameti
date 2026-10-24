import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { rotationCreateSchema } from "@/lib/validation/schemas";
import KametiRotation from "@/models/KametiRotation";
import KametiTurn from "@/models/KametiTurn";
import Member from "@/models/Member";
import { TURN_STATUS } from "@/lib/constants";

export async function GET() {
  try {
    await connectDB();
    const rotations = await KametiRotation.find()
      .sort({ createdAt: -1 })
      .lean();
    return jsonOk(rotations);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to load rotations", 500);
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await parseBody(request);
    const parsed = rotationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    await KametiRotation.updateMany({ active: true }, { active: false });

    const members = await Member.find({
      _id: { $in: parsed.data.memberIds },
      active: true,
    }).lean();

    const memberMap = Object.fromEntries(
      members.map((m) => [String(m._id), m]),
    );

    const orderedMembers = parsed.data.memberIds
      .map((id) => memberMap[id])
      .filter(Boolean);

    if (orderedMembers.length !== parsed.data.memberIds.length) {
      return jsonError("Some members were not found or inactive", 400);
    }

    const pastByMember = Object.fromEntries(
      (parsed.data.pastTurns || []).map((p) => [p.memberId, p]),
    );

    const rotation = await KametiRotation.create({
      label: parsed.data.label || "Rotation",
      startDate: parsed.data.startDate
        ? new Date(parsed.data.startDate)
        : new Date(),
      memberIds: orderedMembers.map((m) => m._id),
      notes: parsed.data.notes,
      active: true,
    });

    const turns = orderedMembers.map((member, index) => {
      const past = pastByMember[String(member._id)];
      const completed = Boolean(past);
      return {
        rotationId: rotation._id,
        turnNumber: index + 1,
        memberId: member._id,
        memberNameSnapshot: member.nickname || member.fullName,
        status: completed ? TURN_STATUS.COMPLETED : TURN_STATUS.PENDING,
        treatAmountPaisa: past?.treatAmountPaisa ?? 0,
        completedAt:
          completed && past?.completedAt
            ? new Date(past.completedAt)
            : completed
              ? new Date()
              : null,
        notes: past?.notes ?? "",
      };
    });

    await KametiTurn.insertMany(turns);

    return jsonOk(rotation, 201);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to create rotation", 500);
  }
}
