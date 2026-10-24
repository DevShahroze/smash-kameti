import { TRANSACTION_TYPES, PAYMENT_SYSTEMS, PARTICIPANT_KIND } from "@/lib/constants";
import { computeBalances, balancesToArray } from "@/lib/accounting/balances";
import { recommendTransfers } from "@/lib/accounting/settlement";

export const SETTLEMENT_SCOPE = {
  KAMETI: "kameti",
  AMERICAN: "american",
  OVERALL: "overall",
};

function paymentSystemForOuting(outingId, outingPaymentById) {
  if (!outingId) {
    return null;
  }
  return outingPaymentById.get(String(outingId)) || null;
}

function outingIncludedInSettlements(outingId, settlementContext) {
  const id = String(outingId);
  if (settlementContext.settlementsIncludedByOutingId.get(id) === false) {
    return false;
  }
  const system = paymentSystemForOuting(outingId, settlementContext.outingPaymentById);
  if (system !== PAYMENT_SYSTEMS.KAMETI) {
    return true;
  }
  const rotationId = settlementContext.outingRotationByOutingId.get(id);
  if (!rotationId) {
    return true;
  }
  if (settlementContext.settlementsIncludedByRotationId.get(rotationId) === false) {
    return false;
  }
  return true;
}

export function filterAllocationsForScope(allocations, scope, settlementContext) {
  return allocations.filter((a) => {
    const system = paymentSystemForOuting(
      a.outingId,
      settlementContext.outingPaymentById,
    );
    if (!outingIncludedInSettlements(a.outingId, settlementContext)) {
      return false;
    }
    if (scope === SETTLEMENT_SCOPE.AMERICAN) {
      return system === PAYMENT_SYSTEMS.AMERICAN;
    }
    if (scope === SETTLEMENT_SCOPE.KAMETI) {
      return system === PAYMENT_SYSTEMS.KAMETI;
    }
    return true;
  });
}

export function filterTransactionsForScope(transactions, scope, settlementContext) {
  return transactions.filter((t) => {
    if (!t.affectsSettlement) {
      return false;
    }
    if (t.type === TRANSACTION_TYPES.MEMBER_TRANSFER) {
      return scope === SETTLEMENT_SCOPE.OVERALL;
    }
    if (t.outingId) {
      if (!outingIncludedInSettlements(t.outingId, settlementContext)) {
        return false;
      }
      const system = paymentSystemForOuting(
        t.outingId,
        settlementContext.outingPaymentById,
      );
      if (scope === SETTLEMENT_SCOPE.AMERICAN) {
        return system === PAYMENT_SYSTEMS.AMERICAN;
      }
      if (scope === SETTLEMENT_SCOPE.KAMETI) {
        return system === PAYMENT_SYSTEMS.KAMETI;
      }
      return true;
    }
    return scope === SETTLEMENT_SCOPE.OVERALL;
  });
}

export function computeSettlementTransfers({
  scope,
  allocations,
  transactions,
  participants,
  settlementContext,
}) {
  const scopedAllocations = filterAllocationsForScope(
    allocations,
    scope,
    settlementContext,
  );
  const scopedTransactions = filterTransactionsForScope(
    transactions,
    scope,
    settlementContext,
  );

  const balanceMap = computeBalances({
    allocations: scopedAllocations,
    transactions: scopedTransactions,
    participants,
  });

  const memberRows = balancesToArray(balanceMap).filter(
    (b) => b.kind === PARTICIPANT_KIND.MEMBER,
  );

  return recommendTransfers(memberRows);
}
