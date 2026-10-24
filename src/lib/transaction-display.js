import { TRANSACTION_TYPES, transactionTypeLabel } from "@/lib/constants";

function capitalize(s) {
  if (!s) {
    return "";
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function outingBits(outing) {
  if (!outing) {
    return [];
  }
  const bits = [
    `${capitalize(outing.paymentSystem)} week ${outing.weekNumber}`,
  ];
  if (outing.venueNameSnapshot) {
    bits.push(outing.venueNameSnapshot);
  }
  return bits;
}

/** One factual purpose line from stored data only. */
export function transactionPurpose(tx) {
  const o = tx.outing;
  const note = tx.notes?.trim() || "";

  switch (tx.type) {
    case TRANSACTION_TYPES.RESTAURANT_BILL:
    case TRANSACTION_TYPES.AMERICAN_CONTRIBUTION: {
      const bits = [...outingBits(o)];
      if (note) {
        bits.push(note);
      }
      if (bits.length) {
        return bits.join(" · ");
      }
      return transactionTypeLabel(tx.type);
    }
    case TRANSACTION_TYPES.MEMBER_TRANSFER: {
      const match = note.match(/^Settlement \((\w+)\)$/);
      if (match) {
        return `Settled (${match[1]}) · ${tx.payerNameSnapshot} → ${tx.recipientNameSnapshot}`;
      }
      const bits = [];
      if (note) {
        bits.push(note);
      }
      if (tx.paymentMethod) {
        bits.push(tx.paymentMethod);
      }
      if (bits.length) {
        return bits.join(" · ");
      }
      return `${tx.payerNameSnapshot} → ${tx.recipientNameSnapshot}`;
    }
    case TRANSACTION_TYPES.ADJUSTMENT:
    case TRANSACTION_TYPES.REFUND:
      return note || transactionTypeLabel(tx.type);
    default:
      return note || transactionTypeLabel(tx.type);
  }
}
