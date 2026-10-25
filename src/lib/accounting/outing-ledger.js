import mongoose from "mongoose";
import {
  PAYMENT_SYSTEMS,
  OUTING_STATUS,
  TRANSACTION_TYPES,
} from "@/lib/constants";
import {
  buildAmericanAllocations,
  buildKametiAllocations,
} from "@/lib/accounting/american";
import { sameParticipantRef } from "@/lib/money";
import ExpenseAllocation from "@/models/ExpenseAllocation";
import Transaction from "@/models/Transaction";
import GroupSettings from "@/models/GroupSettings";
import KametiTurn from "@/models/KametiTurn";
import KametiRotation from "@/models/KametiRotation";

function participantSnapshot(p) {
  return {
    kind: p.kind,
    refId: p.refId,
    nameSnapshot: p.nameSnapshot,
  };
}

async function kametiRotationSettlementsIncluded(outing, session = null) {
  let turn = null;
  if (outing.kametiTurnId) {
    turn = await KametiTurn.findById(outing.kametiTurnId)
      .select("rotationId")
      .session(session || null)
      .lean();
  } else {
    turn = await KametiTurn.findOne({ outingId: outing._id })
      .select("rotationId")
      .session(session || null)
      .lean();
  }
  if (!turn?.rotationId) {
    return true;
  }
  const rotation = await KametiRotation.findById(turn.rotationId)
    .select("settlementsIncluded")
    .session(session || null)
    .lean();
  return rotation?.settlementsIncluded !== false;
}

export async function syncOutingFinancials(outing, session = null) {
  const opts = session ? { session } : {};
  const outingId = outing._id;

  await ExpenseAllocation.deleteMany({ outingId }, opts);
  await Transaction.deleteMany(
    { outingId, source: "outing_sync" },
    opts,
  );

  if (outing.status === OUTING_STATUS.CANCELLED) {
    return { allocations: [], transactions: [] };
  }

  if (outing.status !== OUTING_STATUS.COMPLETED) {
    return { allocations: [], transactions: [] };
  }

  if (outing.settlementsIncluded === false) {
    return { allocations: [], transactions: [] };
  }

  if (outing.paymentSystem === PAYMENT_SYSTEMS.KAMETI) {
    const rotationIncluded = await kametiRotationSettlementsIncluded(
      outing,
      session,
    );
    if (!rotationIncluded) {
      return { allocations: [], transactions: [] };
    }
  }

  const settings =
    (await GroupSettings.findOne().session(session || null)) ||
    (await GroupSettings.create(
      [{ accountingMode: "expense_based" }],
      opts,
    ).then((d) => d[0]));

  const allocations = [];
  const transactions = [];

  if (outing.paymentSystem === PAYMENT_SYSTEMS.AMERICAN) {
    const built = buildAmericanAllocations({
      outingId,
      sharedBillPaisa: outing.sharedBillPaisa,
      chargeableParticipants: outing.chargeableParticipants,
      parcels: outing.parcels || [],
    });
    allocations.push(...built);
  } else if (outing.paymentSystem === PAYMENT_SYSTEMS.KAMETI) {
    const built = buildKametiAllocations({
      outingId,
      sharedBillPaisa: outing.sharedBillPaisa,
      attendance: outing.attendance || [],
      parcels: outing.parcels || [],
    });
    allocations.push(...built);
  }

  for (const payment of outing.payments || []) {
    if (String(payment.appliesTo || "").startsWith("parcel:")) {
      continue;
    }
    transactions.push({
      outingId,
      source: "outing_sync",
      type:
        outing.paymentSystem === PAYMENT_SYSTEMS.AMERICAN
          ? TRANSACTION_TYPES.AMERICAN_CONTRIBUTION
          : TRANSACTION_TYPES.RESTAURANT_BILL,
      amountPaisa: payment.amountPaisa,
      payerKind: payment.paidBy.kind,
      payerId: payment.paidBy.refId,
      payerNameSnapshot: payment.paidBy.nameSnapshot,
      affectsSettlement: true,
      transactionDate: outing.actualDate || outing.scheduledDate || new Date(),
      notes: "Shared bill",
      paymentMethod: payment.paymentMethod || "",
    });
  }

  for (const parcel of outing.parcels || []) {
    const amountPaisa = parcel.amountPaisa || 0;
    if (amountPaisa <= 0 || !parcel.paidBy || !parcel.orderedBy) {
      continue;
    }
    if (sameParticipantRef(parcel.orderedBy, parcel.paidBy)) {
      continue;
    }
    transactions.push({
      outingId,
      source: "outing_sync",
      type:
        outing.paymentSystem === PAYMENT_SYSTEMS.AMERICAN
          ? TRANSACTION_TYPES.AMERICAN_CONTRIBUTION
          : TRANSACTION_TYPES.RESTAURANT_BILL,
      amountPaisa,
      payerKind: parcel.paidBy.kind,
      payerId: parcel.paidBy.refId,
      payerNameSnapshot: parcel.paidBy.nameSnapshot,
      affectsSettlement: true,
      transactionDate: outing.actualDate || outing.scheduledDate || new Date(),
      notes: "Parcel payment",
      paymentMethod: "",
    });
  }

  if (allocations.length) {
    await ExpenseAllocation.insertMany(allocations, opts);
  }
  if (transactions.length) {
    await Transaction.insertMany(transactions, opts);
  }

  return { allocations, transactions };
}

export async function removeOutingFinancials(outingId, session = null) {
  const opts = session ? { session } : {};
  await ExpenseAllocation.deleteMany({ outingId }, opts);
  await Transaction.deleteMany({ outingId }, opts);
}

export async function runWithOptionalTransaction(work) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await work(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    if (
      err.message?.includes("Transaction numbers are only allowed") ||
      err.code === 20
    ) {
      return work(null);
    }
    throw err;
  } finally {
    session.endSession();
  }
}
