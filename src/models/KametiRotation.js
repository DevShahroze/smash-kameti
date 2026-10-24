import mongoose from "mongoose";

const KametiRotationSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    active: { type: Boolean, default: true },
    /** When false, this rotation's Kameti bills are excluded from all settlements. */
    settlementsIncluded: { type: Boolean, default: true },
    memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.models.KametiRotation ||
  mongoose.model("KametiRotation", KametiRotationSchema);
