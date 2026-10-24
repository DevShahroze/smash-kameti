import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { turnReorderSchema } from "@/lib/validation/schemas";
import KametiTurn from "@/models/KametiTurn";
import Member from "@/models/Member";
import { TURN_STATUS } from "@/lib/constants";

export async function POST(request) {
  try {
    await connectDB();
    const body = await parseBody(request);
    const parsed = turnReorderSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    for (const item of parsed.data.turns) {
      const turn = await KametiTurn.findById(item.turnId);
      if (!turn) {
        continue;
      }
      if (turn.status !== TURN_STATUS.PENDING) {
        continue;
      }
      turn.turnNumber = item.turnNumber;
      if (item.memberId) {
        const member = await Member.findById(item.memberId).lean();
        if (member) {
          turn.memberId = member._id;
          turn.memberNameSnapshot = member.nickname || member.fullName;
        }
      }
      await turn.save();
    }

    return jsonOk({ updated: true });
  } catch (err) {
    console.error(err);
    return jsonError("Failed to reorder turns", 500);
  }
}
