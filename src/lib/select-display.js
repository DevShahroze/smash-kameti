/** Normalize select values so triggers match SelectItem values (Mongo ids, etc.). */
export function selectId(id) {
  return id == null || id === "" ? "" : String(id);
}

export function memberDisplayName(m) {
  if (!m) {
    return "";
  }
  return m.nickname || m.fullName || "";
}

export function memberLabelById(members, memberId) {
  const id = selectId(memberId);
  if (!id) {
    return "";
  }
  const m = members.find((x) => selectId(x._id) === id);
  return memberDisplayName(m);
}

export function venueNameById(venues, venueId) {
  const id = selectId(venueId);
  if (!id) {
    return "";
  }
  const v = venues.find((x) => selectId(x._id) === id);
  return v?.name ?? "";
}

export function rotationDisplayName(rotation) {
  if (!rotation) {
    return "";
  }
  return (
    rotation.label ||
    `Kameti ${new Date(rotation.createdAt).toLocaleDateString()}`
  );
}

export function rotationLabelById(rotations, rotationId, { showActive = true } = {}) {
  const id = selectId(rotationId);
  if (!id) {
    return "";
  }
  const r = rotations.find((x) => selectId(x._id) === id);
  if (!r) {
    return "";
  }
  const title = rotationDisplayName(r);
  if (showActive && r.active) {
    return `${title} · active`;
  }
  return title;
}

export function labelFromMap(map, value) {
  if (value == null || value === "") {
    return "";
  }
  return map[value] ?? String(value);
}

export const ACCOUNTING_MODE_LABELS = {
  expense_based: "Expense-based (Kameti tracked separately)",
  combined: "Combined (Kameti host bill affects settlement)",
};
