import mongoose from "mongoose";

const MemberSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    nickname: { type: String, trim: true, default: "" },
    contact: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true },
    kametiTurnNumber: { type: Number, default: null },
    dateAdded: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

MemberSchema.index({ active: 1, fullName: 1 });

export default mongoose.models.Member ||
  mongoose.model("Member", MemberSchema);
