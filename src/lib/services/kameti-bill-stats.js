import { buildKametiAllocations } from "@/lib/accounting/american";
import { ALLOCATION_TYPES } from "@/lib/constants";

export function parcelTotalPaisa(outing) {
  return (outing?.parcels || []).reduce(
    (sum, p) => sum + (p.amountPaisa || 0),
    0,
  );
}

/** Kameti: sharedBillPaisa is the full amount the host paid (parcels included). */
export function kametiSplitPaisa(outing) {
  const totalBillPaisa = outing?.sharedBillPaisa || 0;
  const parcelSum = parcelTotalPaisa(outing);
  return Math.max(0, totalBillPaisa - parcelSum);
}

export function billStatsFromOuting(outing) {
  const totalBillPaisa = outing?.sharedBillPaisa || 0;
  const parcelSum = parcelTotalPaisa(outing);
  return {
    totalBillPaisa,
    treatAmountPaisa: Math.max(0, totalBillPaisa - parcelSum),
    parcelTotalPaisa: parcelSum,
  };
}

/** Per-member treat share + personal parcel (same rules as settlements). */
export function kametiPerMemberPayFromOuting(outing) {
  if (!outing) {
    return [];
  }
  const allocations = buildKametiAllocations({
    outingId: outing._id || "preview",
    sharedBillPaisa: outing.sharedBillPaisa || 0,
    attendance: outing.attendance || [],
    parcels: outing.parcels || [],
  });
  const byMemberId = new Map();
  for (const alloc of allocations) {
    if (alloc.participantKind !== "member") {
      continue;
    }
    const memberId = String(alloc.participantId);
    if (!byMemberId.has(memberId)) {
      byMemberId.set(memberId, {
        memberId,
        name: alloc.participantNameSnapshot,
        treatSharePaisa: 0,
        parcelPaisa: 0,
      });
    }
    const row = byMemberId.get(memberId);
    if (alloc.allocationType === ALLOCATION_TYPES.KAMETI_SHARED) {
      row.treatSharePaisa += alloc.amountPaisa;
    } else if (alloc.allocationType === ALLOCATION_TYPES.AMERICAN_PARCEL) {
      row.parcelPaisa += alloc.amountPaisa;
    }
  }
  return Array.from(byMemberId.values())
    .map((row) => ({
      ...row,
      totalPayPaisa: row.treatSharePaisa + row.parcelPaisa,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function enrichTurnWithBillStats(turn, outingById) {
  const outing = turn.outingId
    ? outingById.get(String(turn.outingId))
    : null;
  if (outing) {
    const stats = billStatsFromOuting(outing);
    const perMemberPay = kametiPerMemberPayFromOuting(outing);
    const payersCount = perMemberPay.filter((r) => r.treatSharePaisa > 0).length;
    const treatSharePerMemberPaisa =
      payersCount > 0 ? perMemberPay.find((r) => r.treatSharePaisa > 0)?.treatSharePaisa ?? 0 : 0;
    return {
      ...turn,
      ...stats,
      perMemberPay,
      payersCount,
      treatSharePerMemberPaisa,
    };
  }
  const treat = turn.treatAmountPaisa || 0;
  const total = turn.totalBillPaisa ?? treat;
  return {
    ...turn,
    treatAmountPaisa: treat,
    totalBillPaisa: total,
    parcelTotalPaisa: Math.max(0, total - treat),
  };
}
