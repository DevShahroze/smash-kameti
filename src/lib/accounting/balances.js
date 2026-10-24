import { participantKey } from "@/lib/money";
import {
  TRANSACTION_TYPES,
  ACCOUNTING_MODES,
} from "@/lib/constants";

/**
 * Net balance (paisa): positive = should receive, negative = owes.
 * paidOnBehalf - personalShare + transfersIn - transfersOut + adjustments
 */
export function computeBalances({
  allocations,
  transactions,
  participants,
}) {
  const map = {};

  for (const p of participants) {
    const key = participantKey(p.kind, p.id);
    map[key] = {
      kind: p.kind,
      id: String(p.id),
      name: p.name,
      paidOnBehalfPaisa: 0,
      personalSharePaisa: 0,
      transfersReceivedPaisa: 0,
      transfersSentPaisa: 0,
      adjustmentsPaisa: 0,
      netBalancePaisa: 0,
    };
  }

  for (const alloc of allocations) {
    const key = participantKey(alloc.participantKind, alloc.participantId);
    if (!map[key]) {
      map[key] = {
        kind: alloc.participantKind,
        id: String(alloc.participantId),
        name: alloc.participantNameSnapshot,
        paidOnBehalfPaisa: 0,
        personalSharePaisa: 0,
        transfersReceivedPaisa: 0,
        transfersSentPaisa: 0,
        adjustmentsPaisa: 0,
        netBalancePaisa: 0,
      };
    }
    map[key].personalSharePaisa += alloc.amountPaisa;
  }

  for (const tx of transactions) {
    if (!tx.affectsSettlement) {
      continue;
    }

    if (
      tx.type === TRANSACTION_TYPES.RESTAURANT_BILL ||
      tx.type === TRANSACTION_TYPES.AMERICAN_CONTRIBUTION
    ) {
      const payerKey = participantKey(tx.payerKind, tx.payerId);
      if (!map[payerKey]) {
        map[payerKey] = {
          kind: tx.payerKind,
          id: String(tx.payerId),
          name: tx.payerNameSnapshot || "Unknown",
          paidOnBehalfPaisa: 0,
          personalSharePaisa: 0,
          transfersReceivedPaisa: 0,
          transfersSentPaisa: 0,
          adjustmentsPaisa: 0,
          netBalancePaisa: 0,
        };
      }
      map[payerKey].paidOnBehalfPaisa += tx.amountPaisa;
    }

    if (tx.type === TRANSACTION_TYPES.MEMBER_TRANSFER) {
      const fromKey = participantKey(tx.payerKind, tx.payerId);
      const toKey = participantKey(tx.recipientKind, tx.recipientId);
      if (map[fromKey]) {
        map[fromKey].transfersSentPaisa += tx.amountPaisa;
      }
      if (map[toKey]) {
        map[toKey].transfersReceivedPaisa += tx.amountPaisa;
      }
    }

    if (
      tx.type === TRANSACTION_TYPES.ADJUSTMENT ||
      tx.type === TRANSACTION_TYPES.REFUND
    ) {
      const key = participantKey(tx.payerKind, tx.payerId);
      if (!map[key]) {
        map[key] = {
          kind: tx.payerKind,
          id: String(tx.payerId),
          name: tx.payerNameSnapshot || "Unknown",
          paidOnBehalfPaisa: 0,
          personalSharePaisa: 0,
          transfersReceivedPaisa: 0,
          transfersSentPaisa: 0,
          adjustmentsPaisa: 0,
          netBalancePaisa: 0,
        };
      }
      map[key].adjustmentsPaisa += tx.amountPaisa;
    }
  }

  for (const key of Object.keys(map)) {
    const row = map[key];
    row.netBalancePaisa =
      row.paidOnBehalfPaisa -
      row.personalSharePaisa +
      row.transfersReceivedPaisa -
      row.transfersSentPaisa +
      row.adjustmentsPaisa;
  }

  return map;
}

export function balancesToArray(balanceMap) {
  return Object.values(balanceMap).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

/** Positive = should receive; negative = owes; zero = settled. */
export function balanceStatus(netBalancePaisa) {
  const n = Number(netBalancePaisa) || 0;
  if (n > 0) {
    return { kind: "receive", amountPaisa: n };
  }
  if (n < 0) {
    return { kind: "owe", amountPaisa: -n };
  }
  return { kind: "settled", amountPaisa: 0 };
}

/** Sum of net balances should be zero when ledger is consistent. */
export function sumNetBalances(balanceRows) {
  return balanceRows.reduce((s, r) => s + (r.netBalancePaisa || 0), 0);
}

export function kametiPaymentAffectsSettlement(accountingMode) {
  return accountingMode === ACCOUNTING_MODES.COMBINED;
}
