import mongoose from "mongoose";
import Outing from "@/models/Outing";
import Venue from "@/models/Venue";
import {
  removeOutingFinancials,
  syncOutingFinancials,
} from "@/lib/accounting/outing-ledger";
import AuditLog from "@/models/AuditLog";
import KametiTurn from "@/models/KametiTurn";
import { billStatsFromOuting } from "@/lib/services/kameti-bill-stats";

async function linkKametiTurn(outing) {
  if (!outing.kametiTurnId) {
    return;
  }
  const stats = billStatsFromOuting(outing);
  await KametiTurn.findByIdAndUpdate(outing.kametiTurnId, {
    outingId: outing._id,
    treatAmountPaisa: stats.treatAmountPaisa,
    totalBillPaisa: stats.totalBillPaisa,
  });
}

function toDate(value) {
  if (!value) {
    return null;
  }
  return new Date(value);
}

function mapParticipantRef(p) {
  return {
    kind: p.kind,
    refId: new mongoose.Types.ObjectId(String(p.refId)),
    nameSnapshot: p.nameSnapshot,
  };
}

export function mapOutingInput(parsed) {
  return {
    weekNumber: parsed.weekNumber,
    scheduledDate: toDate(parsed.scheduledDate),
    actualDate: toDate(parsed.actualDate),
    venueId: parsed.venueId
      ? new mongoose.Types.ObjectId(parsed.venueId)
      : null,
    venueNameSnapshot: parsed.venueNameSnapshot,
    paymentSystem: parsed.paymentSystem,
    status: parsed.status,
    kametiTurnId: parsed.kametiTurnId
      ? new mongoose.Types.ObjectId(parsed.kametiTurnId)
      : null,
    hostMemberId: parsed.hostMemberId
      ? new mongoose.Types.ObjectId(parsed.hostMemberId)
      : null,
    hostMemberNameSnapshot: parsed.hostMemberNameSnapshot,
    sharedBillPaisa: parsed.sharedBillPaisa,
    additionalExpensesPaisa: parsed.additionalExpensesPaisa,
    parcels: (parsed.parcels || []).map((parcel) => ({
      _id: parcel._id
        ? new mongoose.Types.ObjectId(String(parcel._id))
        : new mongoose.Types.ObjectId(),
      orderedBy: mapParticipantRef(parcel.orderedBy),
      amountPaisa: parcel.amountPaisa,
      paidBy: mapParticipantRef(parcel.paidBy),
      notes: parcel.notes || "",
    })),
    payments: (parsed.payments || []).map((payment) => ({
      paidBy: mapParticipantRef(payment.paidBy),
      amountPaisa: payment.amountPaisa,
      appliesTo: payment.appliesTo || "shared",
      paymentMethod: payment.paymentMethod || "",
    })),
    chargeableParticipants: (parsed.chargeableParticipants || []).map(
      mapParticipantRef,
    ),
    attendance: (parsed.attendance || []).map((a) => ({
      memberId: new mongoose.Types.ObjectId(a.memberId),
      memberNameSnapshot: a.memberNameSnapshot,
      status: a.status,
      paysShare: a.paysShare !== false,
    })),
    guests: (parsed.guests || []).map((g) => ({
      guestId: g.guestId ? new mongoose.Types.ObjectId(g.guestId) : null,
      nameSnapshot: g.nameSnapshot,
      attended: g.attended,
      chargeableAmerican: g.chargeableAmerican,
    })),
    notes: parsed.notes || "",
    settlementsIncluded:
      typeof parsed.settlementsIncluded === "boolean"
        ? parsed.settlementsIncluded
        : true,
  };
}

export async function findOutingForKametiTurn(kametiTurnId) {
  const turn = await KametiTurn.findById(kametiTurnId).lean();
  if (turn?.outingId) {
    const byTurnLink = await Outing.findById(turn.outingId);
    if (byTurnLink) {
      return byTurnLink;
    }
  }
  return Outing.findOne({
    kametiTurnId: new mongoose.Types.ObjectId(String(kametiTurnId)),
  });
}

export async function createOuting(parsed) {
  if (parsed.kametiTurnId) {
    const existing = await findOutingForKametiTurn(parsed.kametiTurnId);
    if (existing) {
      return updateOuting(String(existing._id), parsed);
    }
  }

  let venueName = parsed.venueNameSnapshot;
  if (parsed.venueId && !venueName) {
    const venue = await Venue.findById(parsed.venueId).lean();
    venueName = venue?.name || "";
  }

  const data = mapOutingInput({ ...parsed, venueNameSnapshot: venueName });
  const outing = await Outing.create(data);
  await syncOutingFinancials(outing);
  await AuditLog.create({
    entityType: "outing",
    entityId: outing._id,
    action: "create",
    summary: `Outing week ${outing.weekNumber} created`,
    after: outing.toObject(),
  });
  await linkKametiTurn(outing);
  return outing;
}

export async function updateOuting(id, parsed) {
  const existing = await Outing.findById(id);
  if (!existing) {
    return null;
  }

  const before = existing.toObject();
  const data = mapOutingInput(parsed);
  existing.set(data);
  await existing.save();
  await syncOutingFinancials(existing);
  await AuditLog.create({
    entityType: "outing",
    entityId: existing._id,
    action: "update",
    summary: `Outing week ${existing.weekNumber} updated`,
    before,
    after: existing.toObject(),
  });
  await linkKametiTurn(existing);
  return existing;
}

async function unlinkKametiTurnForOuting(outing) {
  await KametiTurn.updateMany(
    { outingId: outing._id },
    { outingId: null, treatAmountPaisa: 0, totalBillPaisa: 0 },
  );
  if (outing.kametiTurnId) {
    await KametiTurn.findByIdAndUpdate(outing.kametiTurnId, {
      outingId: null,
      treatAmountPaisa: 0,
      totalBillPaisa: 0,
    });
  }
}

export async function deleteOuting(id) {
  const existing = await Outing.findById(id);
  if (!existing) {
    return null;
  }

  const before = existing.toObject();
  await removeOutingFinancials(existing._id);
  await unlinkKametiTurnForOuting(existing);
  await existing.deleteOne();

  await AuditLog.create({
    entityType: "outing",
    entityId: existing._id,
    action: "delete",
    summary: `Outing week ${before.weekNumber} deleted`,
    before,
  });

  return { deleted: true };
}
