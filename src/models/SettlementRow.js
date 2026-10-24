import mongoose from "mongoose";

const SettlementRowSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["kameti", "american", "overall"],
      required: true,
    },
    fromMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    toMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    amountPaisa: { type: Number, required: true },
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
  },
  { timestamps: true },
);

SettlementRowSchema.index(
  { scope: 1, fromMemberId: 1, toMemberId: 1, amountPaisa: 1 },
  { unique: true },
);

export default mongoose.models.SettlementRow ||
  mongoose.model("SettlementRow", SettlementRowSchema);
