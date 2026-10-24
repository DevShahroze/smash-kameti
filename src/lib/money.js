const PKR_SYMBOL = "Rs.";

export function paisaFromRupees(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n)) {
    throw new Error("Invalid amount");
  }
  return Math.round(n * 100);
}

export function rupeesFromPaisa(paisa) {
  const n = Number(paisa);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return n / 100;
}

export function formatPKR(paisa) {
  const rupees = rupeesFromPaisa(paisa);
  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rupees);
  return `${PKR_SYMBOL} ${formatted}`;
}

/**
 * Split totalPaisa equally among count participants.
 * Remainder paisa assigned deterministically to first keys in sorted order.
 */
export function splitEqually(totalPaisa, participantKeys) {
  const keys = [...participantKeys].sort();
  const count = keys.length;
  if (count === 0) {
    return {};
  }
  const base = Math.floor(totalPaisa / count);
  let remainder = totalPaisa - base * count;
  const result = {};
  for (const key of keys) {
    let share = base;
    if (remainder > 0) {
      share += 1;
      remainder -= 1;
    }
    result[key] = share;
  }
  return result;
}

export function participantKey(kind, id) {
  return `${kind}:${String(id)}`;
}

export function parseParticipantKey(key) {
  const [kind, id] = key.split(":");
  return { kind, id };
}
