import mongoose from "mongoose";
import { TURN_STATUS } from "@/lib/constants";

const KametiTurnSchema = new mongoose.Schema(
  {
    rotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KametiRotation",
      required: true,
      index: true,
    },
    turnNumber: { type: Number, required: true },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    memberNameSnapshot: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(TURN_STATUS),
      default: TURN_STATUS.PENDING,
    },
    outingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Outing",
      default: null,
    },
    completedAt: { type: Date, default: null },
    treatAmountPaisa: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

KametiTurnSchema.index({ rotationId: 1, turnNumber: 1 }, { unique: true });
KametiTurnSchema.index({ rotationId: 1, memberId: 1 });

export default mongoose.models.KametiTurn ||
  mongoose.model("KametiTurn", KametiTurnSchema);
