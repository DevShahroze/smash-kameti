export const PAYMENT_SYSTEMS = {
  KAMETI: "kameti",
  AMERICAN: "american",
};

export const OUTING_STATUS = {
  PLANNED: "planned",
  POSTPONED: "postponed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const TURN_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const ATTENDANCE_STATUS = {
  PRESENT: "present",
  ABSENT: "absent",
  NOT_RECORDED: "not_recorded",
};

export const TRANSACTION_TYPES = {
  RESTAURANT_BILL: "restaurant_bill",
  AMERICAN_CONTRIBUTION: "american_contribution",
  MEMBER_TRANSFER: "member_transfer",
  ADJUSTMENT: "adjustment",
  REFUND: "refund",
};

const TRANSACTION_TYPE_LABELS = {
  [TRANSACTION_TYPES.RESTAURANT_BILL]: "Restaurant bill",
  [TRANSACTION_TYPES.AMERICAN_CONTRIBUTION]: "American payment",
  [TRANSACTION_TYPES.MEMBER_TRANSFER]: "Member transfer",
  [TRANSACTION_TYPES.ADJUSTMENT]: "Adjustment",
  [TRANSACTION_TYPES.REFUND]: "Refund",
};

export function transactionTypeLabel(type) {
  if (!type) {
    return "—";
  }
  return (
    TRANSACTION_TYPE_LABELS[type] ||
    String(type).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export const ALLOCATION_TYPES = {
  AMERICAN_SHARED: "american_shared",
  AMERICAN_PARCEL: "american_parcel",
  KAMETI_SHARED: "kameti_shared",
  KAMETI_HOST: "kameti_host",
  ADJUSTMENT: "adjustment",
};

export const ACCOUNTING_MODES = {
  EXPENSE_BASED: "expense_based",
  COMBINED: "combined",
};

export const PARTICIPANT_KIND = {
  MEMBER: "member",
  GUEST: "guest",
};
