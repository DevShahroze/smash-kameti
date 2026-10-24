import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { adjustmentSchema } from "@/lib/validation/schemas";
import Member from "@/models/Member";
import Transaction from "@/models/Transaction";

export async function POST(request) {
  try {
    await connectDB();
    const body = await parseBody(request);
    const parsed = adjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    const member = await Member.findById(parsed.data.memberId).lean();
    if (!member) {
      return jsonError("Member not found", 400);
    }

    const tx = await Transaction.create({
      type: parsed.data.type,
      amountPaisa: parsed.data.amountPaisa,
      payerKind: "member",
      payerId: member._id,
      payerNameSnapshot: member.nickname || member.fullName,
      transactionDate: parsed.data.transactionDate
        ? new Date(parsed.data.transactionDate)
        : new Date(),
      notes: parsed.data.notes,
      affectsSettlement: true,
      source: "manual",
    });

    return jsonOk(tx, 201);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to record adjustment", 500);
  }
}
