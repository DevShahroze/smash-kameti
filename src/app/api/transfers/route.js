import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { transferSchema } from "@/lib/validation/schemas";
import Member from "@/models/Member";
import Transaction from "@/models/Transaction";
import { TRANSACTION_TYPES } from "@/lib/constants";

export async function POST(request) {
  try {
    await connectDB();
    const body = await parseBody(request);
    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    if (parsed.data.fromMemberId === parsed.data.toMemberId) {
      return jsonError("Sender and receiver must differ", 400);
    }

    const [fromMember, toMember] = await Promise.all([
      Member.findById(parsed.data.fromMemberId).lean(),
      Member.findById(parsed.data.toMemberId).lean(),
    ]);

    if (!fromMember || !toMember) {
      return jsonError("Invalid members", 400);
    }

    const tx = await Transaction.create({
      type: TRANSACTION_TYPES.MEMBER_TRANSFER,
      amountPaisa: parsed.data.amountPaisa,
      payerKind: "member",
      payerId: fromMember._id,
      payerNameSnapshot: fromMember.nickname || fromMember.fullName,
      recipientKind: "member",
      recipientId: toMember._id,
      recipientNameSnapshot: toMember.nickname || toMember.fullName,
      transactionDate: parsed.data.transactionDate
        ? new Date(parsed.data.transactionDate)
        : new Date(),
      paymentMethod: parsed.data.paymentMethod,
      notes: parsed.data.notes,
      affectsSettlement: true,
      source: "manual",
    });

    return jsonOk(tx, 201);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to record transfer", 500);
  }
}
