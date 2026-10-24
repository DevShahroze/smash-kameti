export function rotationTitle(r) {
  return r?.label || `Kameti ${new Date(r?.createdAt).toLocaleDateString()}`;
}

export function rotationStartedOn(r) {
  const d = r?.startDate || r?.createdAt;
  return d ? new Date(d).toLocaleDateString() : "—";
}

/** Kameti turn bill: edit existing outing when linked, otherwise new form. */
export function kametiBillPath(turn) {
  if (!turn?._id) {
    return "/outings/new";
  }
  const outingId = turn.outingId ? String(turn.outingId) : "";
  if (outingId) {
    return `/outings/${outingId}`;
  }
  const memberId = String(turn.memberId?._id ?? turn.memberId ?? "");
  const q = new URLSearchParams({
    paymentSystem: "kameti",
    kametiTurnId: String(turn._id),
    hostMemberId: memberId,
    weekNumber: String(turn.turnNumber ?? ""),
    status: "completed",
  });
  return `/outings/new?${q}`;
}
