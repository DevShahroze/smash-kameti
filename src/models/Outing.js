import mongoose from "mongoose";
import {
  PAYMENT_SYSTEMS,
  OUTING_STATUS,
  ATTENDANCE_STATUS,
} from "@/lib/constants";

const ParticipantRefSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["member", "guest"], required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true },
    nameSnapshot: { type: String, required: true },
  },
  { _id: false },
);

const ParcelSchema = new mongoose.Schema({
  orderedBy: { type: ParticipantRefSchema, required: true },
  amountPaisa: { type: Number, required: true, min: 0 },
  paidBy: { type: ParticipantRefSchema, required: true },
  notes: { type: String, default: "" },
});

const PaymentSchema = new mongoose.Schema(
  {
    paidBy: { type: ParticipantRefSchema, required: true },
    amountPaisa: { type: Number, required: true, min: 0 },
    appliesTo: { type: String, default: "shared" },
    paymentMethod: { type: String, default: "" },
  },
  { _id: false },
);

const AttendanceSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    memberNameSnapshot: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS),
      default: ATTENDANCE_STATUS.NOT_RECORDED,
    },
    /** Kameti: include in shared-bill split when true (default). */
    paysShare: { type: Boolean, default: true },
  },
  { _id: false },
);

const OutingGuestSchema = new mongoose.Schema(
  {
    guestId: { type: mongoose.Schema.Types.ObjectId, ref: "Guest" },
    nameSnapshot: { type: String, required: true },
    attended: { type: Boolean, default: true },
    chargeableAmerican: { type: Boolean, default: false },
  },
  { _id: false },
);

const OutingSchema = new mongoose.Schema(
  {
    weekNumber: { type: Number, required: true },
    scheduledDate: { type: Date, default: null },
    actualDate: { type: Date, default: null },
    venueId: { type: mongoose.Schema.Types.ObjectId, ref: "Venue" },
    venueNameSnapshot: { type: String, default: "" },
    paymentSystem: {
      type: String,
      enum: Object.values(PAYMENT_SYSTEMS),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(OUTING_STATUS),
      default: OUTING_STATUS.PLANNED,
    },
    kametiTurnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KametiTurn",
      default: null,
    },
    hostMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    hostMemberNameSnapshot: { type: String, default: "" },
    sharedBillPaisa: { type: Number, default: 0, min: 0 },
    additionalExpensesPaisa: { type: Number, default: 0, min: 0 },
    parcels: [ParcelSchema],
    payments: [PaymentSchema],
    chargeableParticipants: [ParticipantRefSchema],
    attendance: [AttendanceSchema],
    guests: [OutingGuestSchema],
    notes: { type: String, default: "" },
    settlementsIncluded: { type: Boolean, default: true },
  },
  { timestamps: true },
);

OutingSchema.index({ weekNumber: 1 });
OutingSchema.index({ status: 1, actualDate: -1 });
OutingSchema.index({ venueId: 1 });

if (mongoose.models.Outing) {
  delete mongoose.models.Outing;
}

export default mongoose.model("Outing", OutingSchema);
