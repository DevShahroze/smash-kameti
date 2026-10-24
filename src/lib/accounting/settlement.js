/**
 * Greedy settlement: match largest debtor with largest creditor.
 * Amounts in paisa. Only non-zero balances.
 */
export function recommendTransfers(balanceRows) {
  const creditors = balanceRows
    .filter((r) => r.netBalancePaisa > 0)
    .map((r) => ({
      kind: r.kind,
      id: r.id,
      name: r.name,
      remaining: r.netBalancePaisa,
    }))
    .sort((a, b) => b.remaining - a.remaining);

  const debtors = balanceRows
    .filter((r) => r.netBalancePaisa < 0)
    .map((r) => ({
      kind: r.kind,
      id: r.id,
      name: r.name,
      remaining: -r.netBalancePaisa,
    }))
    .sort((a, b) => b.remaining - a.remaining);

  const recommendations = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.remaining, creditor.remaining);
    if (amount <= 0) {
      break;
    }
    recommendations.push({
      fromKind: debtor.kind,
      fromId: debtor.id,
      fromName: debtor.name,
      toKind: creditor.kind,
      toId: creditor.id,
      toName: creditor.name,
      amountPaisa: amount,
    });
    debtor.remaining -= amount;
    creditor.remaining -= amount;
    if (debtor.remaining === 0) {
      i += 1;
    }
    if (creditor.remaining === 0) {
      j += 1;
    }
  }

  return recommendations;
}
