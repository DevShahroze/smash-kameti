import { TRANSACTION_TYPES } from "@/lib/constants";

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

function edgeKey(fromId, toId, bucket) {
  return `${String(fromId)}|${String(toId)}|${bucket}`;
}

function parseEdgeKey(key) {
  const parts = key.split("|");
  return {
    fromId: parts[0],
    toId: parts[1],
    bucket: parts[2],
  };
}

function resolveParcelCreditor(a, outingParcels, parcelTxs) {
  const parcelRow = a.parcelId
    ? outingParcels.find((p) => String(p._id) === String(a.parcelId))
    : outingParcels.find((p) => (p.amountPaisa || 0) === a.amountPaisa);
  const paidBy = parcelRow?.paidBy;
  if (paidBy?.refId) {
    return {
      kind: paidBy.kind,
      id: paidBy.refId,
      name: paidBy.nameSnapshot || "Unknown",
    };
  }
  const matchTx =
    parcelTxs.find(
      (t) =>
        t.amountPaisa === a.amountPaisa &&
        String(t.payerId) !== String(a.participantId),
    ) || parcelTxs.find((t) => t.amountPaisa === a.amountPaisa);
  if (!matchTx) {
    return null;
  }
  return {
    kind: matchTx.payerKind,
    id: matchTx.payerId,
    name: matchTx.payerNameSnapshot || "Unknown",
  };
}

/**
 * American scope: one line per (debtor → creditor); shared split and parcels on the same pair are summed.
 * Dinner share offsets parcel debts to third parties (not the bill host) before paying the host.
 */
export function recommendDirectedTransfers(
  allocations,
  transactions,
  balanceRows = [],
  settlementContext = {},
) {
  const edges = new Map();
  const meta = new Map();

  function addEdge(
    fromKind,
    fromId,
    fromName,
    toKind,
    toId,
    toName,
    amountPaisa,
    bucket,
  ) {
    if (amountPaisa <= 0) {
      return;
    }
    if (fromKind === toKind && String(fromId) === String(toId)) {
      return;
    }
    const key = edgeKey(fromId, toId, bucket);
    edges.set(key, (edges.get(key) || 0) + amountPaisa);
    if (!meta.has(key)) {
      meta.set(key, {
        fromKind,
        fromId: String(fromId),
        fromName,
        toKind,
        toId: String(toId),
        toName,
        obligationKind: bucket,
      });
    }
  }

  const allocsByOuting = new Map();
  for (const a of allocations) {
    const oid = String(a.outingId);
    if (!allocsByOuting.has(oid)) {
      allocsByOuting.set(oid, []);
    }
    allocsByOuting.get(oid).push(a);
  }

  for (const [outingId, outingAllocs] of allocsByOuting) {
    const outingTxs = transactions.filter(
      (t) => t.outingId && String(t.outingId) === outingId,
    );
    const sharedPayerTx = outingTxs.find(
      (t) =>
        (t.type === TRANSACTION_TYPES.AMERICAN_CONTRIBUTION ||
          t.type === TRANSACTION_TYPES.RESTAURANT_BILL) &&
        t.notes !== "Parcel payment",
    );
    const parcelTxs = outingTxs.filter((t) => t.notes === "Parcel payment");
    const outingParcels =
      settlementContext.parcelsByOutingId?.get(outingId) || [];

    for (const a of outingAllocs) {
      if (a.allocationType === "american_shared" && sharedPayerTx) {
        if (
          String(a.participantId) === String(sharedPayerTx.payerId) &&
          a.participantKind === sharedPayerTx.payerKind
        ) {
          continue;
        }
        addEdge(
          a.participantKind,
          a.participantId,
          a.participantNameSnapshot,
          sharedPayerTx.payerKind,
          sharedPayerTx.payerId,
          sharedPayerTx.payerNameSnapshot,
          a.amountPaisa,
          "shared",
        );
      }
      if (a.allocationType === "american_parcel") {
        const creditor = resolveParcelCreditor(a, outingParcels, parcelTxs);
        if (!creditor) {
          continue;
        }
        addEdge(
          a.participantKind,
          a.participantId,
          a.participantNameSnapshot,
          creditor.kind,
          creditor.id,
          creditor.name,
          a.amountPaisa,
          "parcel",
        );
      }
    }
  }

  const debtorIds = new Set(
    [...meta.values()].map((m) => m.fromId),
  );

  for (const fromId of debtorIds) {
    const sharedKeys = [...edges.keys()].filter((key) => {
      const p = parseEdgeKey(key);
      return p.fromId === fromId && p.bucket === "shared";
    });
    if (sharedKeys.length === 0) {
      continue;
    }

    const dinnerHostIds = new Set(
      sharedKeys.map((key) => parseEdgeKey(key).toId),
    );
    let sharedPool = sharedKeys.reduce(
      (sum, key) => sum + (edges.get(key) || 0),
      0,
    );
    const originalShared = sharedPool;

    const parcelKeys = [...edges.keys()].filter((key) => {
      const p = parseEdgeKey(key);
      return (
        p.fromId === fromId &&
        p.bucket === "parcel" &&
        !dinnerHostIds.has(p.toId)
      );
    });
    parcelKeys.sort((a, b) => (edges.get(b) || 0) - (edges.get(a) || 0));

    for (const key of parcelKeys) {
      if (sharedPool <= 0) {
        break;
      }
      const amount = edges.get(key) || 0;
      const reduce = Math.min(amount, sharedPool);
      sharedPool -= reduce;
      const next = amount - reduce;
      if (next <= 0) {
        edges.delete(key);
        meta.delete(key);
      } else {
        edges.set(key, next);
      }
    }

    if (sharedPool <= 0) {
      for (const key of sharedKeys) {
        edges.delete(key);
        meta.delete(key);
      }
    } else if (sharedKeys.length === 1) {
      edges.set(sharedKeys[0], sharedPool);
    } else {
      let remainder = sharedPool;
      for (let i = 0; i < sharedKeys.length; i++) {
        const key = sharedKeys[i];
        const share = edges.get(key) || 0;
        const part =
          i === sharedKeys.length - 1
            ? remainder
            : Math.floor((share * sharedPool) / originalShared);
        remainder -= part;
        if (part <= 0) {
          edges.delete(key);
          meta.delete(key);
        } else {
          edges.set(key, part);
        }
      }
    }
  }

  const creditorIds = new Set(
    balanceRows
      .filter((r) => r.netBalancePaisa > 0)
      .map((r) => String(r.id)),
  );
  for (const key of [...edges.keys()]) {
    const { fromId } = parseEdgeKey(key);
    if (creditorIds.has(fromId)) {
      edges.delete(key);
      meta.delete(key);
    }
  }

  const toRemove = new Set();
  for (const key of [...edges.keys()]) {
    if (toRemove.has(key)) {
      continue;
    }
    const { fromId, toId, bucket } = parseEdgeKey(key);
    const revKey = edgeKey(toId, fromId, bucket);
    if (key === revKey || !edges.has(revKey) || toRemove.has(revKey)) {
      continue;
    }
    const forward = edges.get(key) || 0;
    const backward = edges.get(revKey) || 0;
    if (forward > backward) {
      edges.set(key, forward - backward);
      toRemove.add(revKey);
    } else if (backward > forward) {
      edges.set(revKey, backward - forward);
      toRemove.add(key);
    } else {
      toRemove.add(key);
      toRemove.add(revKey);
    }
  }
  for (const key of toRemove) {
    edges.delete(key);
    meta.delete(key);
  }

  const merged = new Map();
  for (const [key, amountPaisa] of edges) {
    const m = meta.get(key);
    if (!m) {
      continue;
    }
    const pairKey = edgeKey(m.fromId, m.toId, "net");
    merged.set(pairKey, {
      fromKind: m.fromKind,
      fromId: m.fromId,
      fromName: m.fromName,
      toKind: m.toKind,
      toId: m.toId,
      toName: m.toName,
      amountPaisa: (merged.get(pairKey)?.amountPaisa || 0) + amountPaisa,
    });
  }

  const recommendations = [...merged.values()];

  recommendations.sort((a, b) => {
    const byFrom = a.fromName.localeCompare(b.fromName);
    if (byFrom !== 0) {
      return byFrom;
    }
    return a.toName.localeCompare(b.toName);
  });

  return recommendations;
}