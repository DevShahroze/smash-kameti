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

export function formatPKR(paisa, options = {}) {
  const { whole = false } = options;
  const rupees = rupeesFromPaisa(paisa);
  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(rupees);
  return `${PKR_SYMBOL} ${formatted}`;
}

/**
 * Split totalPaisa equally among participants.
 * Division uses ceil(total / count); surplus paisa is trimmed from the first
 * keys in sorted order (same tie-break as the old floor + remainder pass).
 */
export function splitEqually(totalPaisa, participantKeys) {
  const keys = [...participantKeys].sort();
  const count = keys.length;
  if (count === 0) {
    return {};
  }
  const base = Math.ceil(totalPaisa / count);
  let surplus = base * count - totalPaisa;
  const result = {};
  for (const key of keys) {
    let share = base;
    if (surplus > 0) {
      share -= 1;
      surplus -= 1;
    }
    result[key] = share;
  }
  return result;
}

export function participantKey(kind, id) {
  return `${kind}:${String(id)}`;
}

export function sameParticipantRef(a, b) {
  if (!a || !b) {
    return false;
  }
  return participantKey(a.kind, a.refId) === participantKey(b.kind, b.refId);
}

export function parseParticipantKey(key) {
  const [kind, id] = key.split(":");
  return { kind, id };
}
