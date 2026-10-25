import { splitEqually, participantKey, sameParticipantRef } from "@/lib/money";
import { ALLOCATION_TYPES, ATTENDANCE_STATUS } from "@/lib/constants";

/**
 * Build expense allocations for American system shared bill and parcels.
 * chargeableParticipants: [{ kind, refId, nameSnapshot }]
 * parcels: [{ _id, orderedBy, amountPaisa }]
 */
export function buildAmericanAllocations({
  outingId,
  sharedBillPaisa,
  chargeableParticipants,
  parcels = [],
  sharedAllocationType = ALLOCATION_TYPES.AMERICAN_SHARED,
}) {
  const allocations = [];
  const chargeable = (chargeableParticipants || []).filter((p) => p && p.refId);
  const keys = chargeable.map((p) => participantKey(p.kind, p.refId));
  const shares = splitEqually(sharedBillPaisa, keys);

  for (const p of chargeable) {
    const key = participantKey(p.kind, p.refId);
    allocations.push({
      outingId,
      participantKind: p.kind,
      participantId: p.refId,
      participantNameSnapshot: p.nameSnapshot,
      allocationType: sharedAllocationType,
      amountPaisa: shares[key] || 0,
    });
  }

  for (const parcel of parcels) {
    const ob = parcel.orderedBy;
    if (sameParticipantRef(ob, parcel.paidBy)) {
      continue;
    }
    allocations.push({
      outingId,
      participantKind: ob.kind,
      participantId: ob.refId,
      participantNameSnapshot: ob.nameSnapshot,
      allocationType: ALLOCATION_TYPES.AMERICAN_PARCEL,
      amountPaisa: parcel.amountPaisa,
      parcelId: parcel._id,
    });
  }

  return allocations;
}

function kametiAttendancePaysShare(row) {
  if (row.paysShare === false) {
    return false;
  }
  if (row.paysShare === true) {
    return true;
  }
  return row.status === ATTENDANCE_STATUS.PRESENT;
}

/**
 * Kameti settlement: shared bill split among members marked Pays share.
 * Host payment is credited separately. Turns/attendance alone do not create debt.
 */
export function buildKametiAllocations({
  outingId,
  sharedBillPaisa,
  attendance = [],
  parcels = [],
}) {
  const parcelSum = (parcels || []).reduce(
    (sum, p) => sum + (p.amountPaisa || 0),
    0,
  );
  const kametiSharedPaisa = Math.max(0, (sharedBillPaisa || 0) - parcelSum);
  const chargeableParticipants = attendance
    .filter(kametiAttendancePaysShare)
    .map((row) => ({
      kind: "member",
      refId: row.memberId,
      nameSnapshot: row.memberNameSnapshot,
    }));

  return buildAmericanAllocations({
    outingId,
    sharedBillPaisa: kametiSharedPaisa,
    chargeableParticipants,
    parcels,
    sharedAllocationType: ALLOCATION_TYPES.KAMETI_SHARED,
  });
}
