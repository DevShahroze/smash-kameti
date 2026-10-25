import Member from "@/models/Member";
import Guest from "@/models/Guest";
import Outing from "@/models/Outing";
import KametiTurn from "@/models/KametiTurn";
import KametiRotation from "@/models/KametiRotation";
import ExpenseAllocation from "@/models/ExpenseAllocation";
import Transaction from "@/models/Transaction";
import { OUTING_STATUS, PARTICIPANT_KIND } from "@/lib/constants";
import { syncOutingFinancials } from "@/lib/accounting/outing-ledger";
import {
  computeBalances,
  balancesToArray,
} from "@/lib/accounting/balances";
import {
  computeSettlementTransfers,
  filterAllocationsForScope,
  filterTransactionsForScope,
  SETTLEMENT_SCOPE,
} from "@/lib/accounting/settlement-scopes";
import {
  annotateTransfersWithSettled,
  listSettlementRows,
} from "@/lib/services/settlement-rows";

/** Rebuild allocations and synced transactions from every completed outing. */
export async function resyncSettlementsFromOutings() {
  const outings = await Outing.find({
    status: OUTING_STATUS.COMPLETED,
  });
  for (const outing of outings) {
    await syncOutingFinancials(outing);
  }
  return outings.length;
}

/** Rebuild ledger rows for every bill linked to a Kameti rotation (after settled toggle). */
export async function resyncOutingsForKametiRotation(rotationId) {
  const turns = await KametiTurn.find({ rotationId })
    .select("_id outingId")
    .lean();
  if (!turns.length) {
    return;
  }
  const turnIds = turns.map((t) => t._id);
  const outingIds = turns
    .filter((t) => t.outingId)
    .map((t) => t.outingId);
  const outings = await Outing.find({
    $or: [{ _id: { $in: outingIds } }, { kametiTurnId: { $in: turnIds } }],
  });
  for (const outing of outings) {
    await syncOutingFinancials(outing);
  }
}

async function buildSettlementContext() {
  const [outings, turns, rotations] = await Promise.all([
    Outing.find().select("_id paymentSystem kametiTurnId settlementsIncluded").lean(),
    KametiTurn.find().select("_id rotationId outingId").lean(),
    KametiRotation.find().select("_id settlementsIncluded").lean(),
  ]);

  const outingPaymentById = new Map(
    outings.map((o) => [String(o._id), o.paymentSystem]),
  );

  const turnToRotation = new Map(
    turns.map((t) => [String(t._id), String(t.rotationId)]),
  );

  const outingRotationByOutingId = new Map();
  for (const t of turns) {
    if (t.outingId) {
      outingRotationByOutingId.set(String(t.outingId), String(t.rotationId));
    }
  }
  for (const o of outings) {
    if (o.kametiTurnId) {
      const rot = turnToRotation.get(String(o.kametiTurnId));
      if (rot) {
        outingRotationByOutingId.set(String(o._id), rot);
      }
    }
  }

  const settlementsIncludedByRotationId = new Map(
    rotations.map((r) => [
      String(r._id),
      r.settlementsIncluded !== false,
    ]),
  );

  const settlementsIncludedByOutingId = new Map(
    outings.map((o) => [String(o._id), o.settlementsIncluded !== false]),
  );

  return {
    outingPaymentById,
    outingRotationByOutingId,
    settlementsIncludedByRotationId,
    settlementsIncludedByOutingId,
  };
}

/** Member/guest balances only — for dashboard (no transfer recomputation). */
export async function getSettlementBalances() {
  const settlementContext = await buildSettlementContext();

  const [members, guests, allocations, transactions] = await Promise.all([
    Member.find().lean(),
    Guest.find().lean(),
    ExpenseAllocation.find().lean(),
    Transaction.find().lean(),
  ]);

  const participants = [
    ...members.map((m) => ({
      kind: PARTICIPANT_KIND.MEMBER,
      id: m._id,
      name: m.nickname || m.fullName,
    })),
    ...guests.map((g) => ({
      kind: PARTICIPANT_KIND.GUEST,
      id: g._id,
      name: g.name,
    })),
  ];

  const overallAllocations = filterAllocationsForScope(
    allocations,
    SETTLEMENT_SCOPE.OVERALL,
    settlementContext,
  );
  const overallTransactions = filterTransactionsForScope(
    transactions,
    SETTLEMENT_SCOPE.OVERALL,
    settlementContext,
  );

  const balanceMap = computeBalances({
    allocations: overallAllocations,
    transactions: overallTransactions,
    participants,
  });
  return balancesToArray(balanceMap);
}

export async function getSettlementLedger(options = {}) {
  const { resync = false } = options;
  if (resync) {
    await resyncSettlementsFromOutings();
  }

  const settlementContext = await buildSettlementContext();

  const [members, guests, allocations, transactions] = await Promise.all([
    Member.find().lean(),
    Guest.find().lean(),
    ExpenseAllocation.find().lean(),
    Transaction.find().lean(),
  ]);

  const participants = [
    ...members.map((m) => ({
      kind: PARTICIPANT_KIND.MEMBER,
      id: m._id,
      name: m.nickname || m.fullName,
    })),
    ...guests.map((g) => ({
      kind: PARTICIPANT_KIND.GUEST,
      id: g._id,
      name: g.name,
    })),
  ];

  const scopeInput = {
    allocations,
    transactions,
    participants,
    settlementContext,
  };

  const settledRows = await listSettlementRows();

  const kametiTransfers = annotateTransfersWithSettled(
    computeSettlementTransfers({
      scope: SETTLEMENT_SCOPE.KAMETI,
      ...scopeInput,
    }),
    SETTLEMENT_SCOPE.KAMETI,
    settledRows,
  );
  const americanTransfers = annotateTransfersWithSettled(
    computeSettlementTransfers({
      scope: SETTLEMENT_SCOPE.AMERICAN,
      ...scopeInput,
    }),
    SETTLEMENT_SCOPE.AMERICAN,
    settledRows,
  );
  const overallTransfers = annotateTransfersWithSettled(
    computeSettlementTransfers({
      scope: SETTLEMENT_SCOPE.OVERALL,
      ...scopeInput,
    }),
    SETTLEMENT_SCOPE.OVERALL,
    settledRows,
  );

  const overallAllocations = filterAllocationsForScope(
    allocations,
    SETTLEMENT_SCOPE.OVERALL,
    settlementContext,
  );
  const overallTransactions = filterTransactionsForScope(
    transactions,
    SETTLEMENT_SCOPE.OVERALL,
    settlementContext,
  );

  const balanceMap = computeBalances({
    allocations: overallAllocations,
    transactions: overallTransactions,
    participants,
  });
  const balances = balancesToArray(balanceMap);
  const memberRows = balances.filter((b) => b.kind === PARTICIPANT_KIND.MEMBER);

  return {
    kameti: { transfers: kametiTransfers },
    american: { transfers: americanTransfers },
    overall: { transfers: overallTransfers, balances },
    balances,
    recommendations: overallTransfers,
    balanceMap,
    ledgerBalanced:
      memberRows.reduce((s, r) => s + r.netBalancePaisa, 0) === 0,
  };
}
