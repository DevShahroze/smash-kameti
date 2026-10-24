import mongoose from "mongoose";
import SettlementRow from "@/models/SettlementRow";
import Transaction from "@/models/Transaction";
import Member from "@/models/Member";
import { TRANSACTION_TYPES } from "@/lib/constants";

function rowKey(scope, fromMemberId, toMemberId, amountPaisa) {
  return {
    scope,
    fromMemberId: new mongoose.Types.ObjectId(String(fromMemberId)),
    toMemberId: new mongoose.Types.ObjectId(String(toMemberId)),
    amountPaisa,
  };
}

export async function listSettlementRows() {
  return SettlementRow.find().lean();
}

export function annotateTransfersWithSettled(transfers, scope, settledRows) {
  return transfers.map((t) => {
    const ack = settledRows.find(
      (r) =>
        r.scope === scope &&
        String(r.fromMemberId) === String(t.fromId) &&
        String(r.toMemberId) === String(t.toId) &&
        r.amountPaisa === t.amountPaisa,
    );
    return {
      ...t,
      settled: Boolean(ack),
      settlementRowId: ack ? String(ack._id) : null,
    };
  });
}

export async function setSettlementRowSettled({
  scope,
  fromMemberId,
  toMemberId,
  amountPaisa,
  settled,
}) {
  const key = rowKey(scope, fromMemberId, toMemberId, amountPaisa);
  const existing = await SettlementRow.findOne(key);

  if (settled) {
    if (existing) {
      return existing;
    }

    const [fromMember, toMember] = await Promise.all([
      Member.findById(fromMemberId).lean(),
      Member.findById(toMemberId).lean(),
    ]);
    if (!fromMember || !toMember) {
      throw new Error("Invalid members");
    }

    const transfer = await Transaction.create({
      type: TRANSACTION_TYPES.MEMBER_TRANSFER,
      amountPaisa,
      payerKind: "member",
      payerId: fromMember._id,
      payerNameSnapshot: fromMember.nickname || fromMember.fullName,
      recipientKind: "member",
      recipientId: toMember._id,
      recipientNameSnapshot: toMember.nickname || toMember.fullName,
      transactionDate: new Date(),
      notes: `Settlement (${scope})`,
      affectsSettlement: true,
      source: "manual",
    });

    return SettlementRow.create({
      ...key,
      transferId: transfer._id,
    });
  }

  if (!existing) {
    return null;
  }

  if (existing.transferId) {
    const tx = await Transaction.findById(existing.transferId);
    if (tx && tx.source === "manual") {
      await tx.deleteOne();
    }
  }
  await existing.deleteOne();
  return null;
}
