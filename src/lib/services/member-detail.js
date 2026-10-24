import Outing from "@/models/Outing";
import KametiTurn from "@/models/KametiTurn";
import ExpenseAllocation from "@/models/ExpenseAllocation";
import Transaction from "@/models/Transaction";
import { getSettlementLedger } from "@/lib/services/ledger";
import { TRANSACTION_TYPES, ALLOCATION_TYPES } from "@/lib/constants";

function allocationLabel(type) {
  if (type === ALLOCATION_TYPES.AMERICAN_SHARED) {
    return "Shared bill share";
  }
  if (type === ALLOCATION_TYPES.AMERICAN_PARCEL) {
    return "Parcel";
  }
  if (type === ALLOCATION_TYPES.KAMETI_SHARED) {
    return "Kameti night share";
  }
  if (type === ALLOCATION_TYPES.KAMETI_HOST) {
    return "Kameti host (legacy)";
  }
  return "Expense";
}

export async function getMemberDetail(memberId) {
  const ledger = await getSettlementLedger();
  const balance = ledger.balances.find(
    (b) => b.kind === "member" && b.id === String(memberId),
  );

  const outings = await Outing.find({
    $or: [
      { hostMemberId: memberId },
      { "attendance.memberId": memberId },
      { "chargeableParticipants.refId": memberId },
      { "parcels.orderedBy.refId": memberId },
    ],
  })
    .sort({ actualDate: -1, scheduledDate: -1 })
    .lean();

  const turns = await KametiTurn.find({ memberId })
    .sort({ turnNumber: 1 })
    .lean();

  const allocations = await ExpenseAllocation.find({
    participantKind: "member",
    participantId: memberId,
  })
    .sort({ createdAt: -1 })
    .lean();

  const outingIds = [
    ...new Set(allocations.map((a) => String(a.outingId)).filter(Boolean)),
  ];
  const outingMeta = outingIds.length
    ? await Outing.find({ _id: { $in: outingIds } })
        .select("weekNumber venueNameSnapshot actualDate scheduledDate paymentSystem")
        .lean()
    : [];
  const outingById = new Map(outingMeta.map((o) => [String(o._id), o]));

  const paidTransactions = await Transaction.find({
    payerKind: "member",
    payerId: memberId,
    affectsSettlement: true,
  })
    .sort({ transactionDate: -1 })
    .lean();

  const transferTransactions = await Transaction.find({
    type: TRANSACTION_TYPES.MEMBER_TRANSFER,
    affectsSettlement: true,
    $or: [{ payerId: memberId }, { recipientId: memberId }],
  })
    .sort({ transactionDate: -1 })
    .lean();

  const expenses = allocations.map((a) => {
    const outing = outingById.get(String(a.outingId));
    return {
      amountPaisa: a.amountPaisa,
      label: allocationLabel(a.allocationType),
      outingId: a.outingId ? String(a.outingId) : null,
      outingLabel: outing
        ? `Week ${outing.weekNumber} · ${outing.venueNameSnapshot || "Outing"}`
        : null,
      date: outing?.actualDate || outing?.scheduledDate || a.createdAt,
    };
  });

  const payments = paidTransactions
    .filter(
      (t) =>
        t.type === TRANSACTION_TYPES.RESTAURANT_BILL ||
        t.type === TRANSACTION_TYPES.AMERICAN_CONTRIBUTION,
    )
    .map((t) => ({
      amountPaisa: t.amountPaisa,
      label: t.notes || "Restaurant payment",
      outingId: t.outingId ? String(t.outingId) : null,
      date: t.transactionDate,
    }));

  const transfersIn = transferTransactions
    .filter((t) => String(t.recipientId) === String(memberId))
    .map((t) => ({
      amountPaisa: t.amountPaisa,
      fromName: t.payerNameSnapshot,
      date: t.transactionDate,
      notes: t.notes || "",
    }));

  const transfersOut = transferTransactions
    .filter((t) => String(t.payerId) === String(memberId))
    .map((t) => ({
      amountPaisa: t.amountPaisa,
      toName: t.recipientNameSnapshot,
      date: t.transactionDate,
      notes: t.notes || "",
    }));

  const totalPaidRestaurant = payments.reduce((s, t) => s + t.amountPaisa, 0);
  const totalShare = expenses.reduce((s, a) => s + a.amountPaisa, 0);

  return {
    balance,
    outings,
    turns,
    history: {
      expenses,
      payments,
      transfersIn,
      transfersOut,
    },
    stats: {
      totalPaidRestaurantPaisa: totalPaidRestaurant,
      totalSharePaisa: totalShare,
      kametiCompleted: turns.filter((t) => t.status === "completed").length,
      kametiPending: turns.filter((t) => t.status === "pending").length,
      transfersReceivedPaisa: transfersIn.reduce((s, t) => s + t.amountPaisa, 0),
      transfersSentPaisa: transfersOut.reduce((s, t) => s + t.amountPaisa, 0),
    },
  };
}
