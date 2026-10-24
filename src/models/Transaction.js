import mongoose from "mongoose";
import { TRANSACTION_TYPES } from "@/lib/constants";

const TransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: true,
    },
    amountPaisa: { type: Number, required: true },
    payerKind: { type: String, enum: ["member", "guest"], required: true },
    payerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    payerNameSnapshot: { type: String, default: "" },
    recipientKind: {
      type: String,
      enum: ["member", "guest", null],
      default: null,
    },
    recipientId: { type: mongoose.Schema.Types.ObjectId, default: null },
    recipientNameSnapshot: { type: String, default: "" },
    outingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Outing",
      default: null,
      index: true,
    },
    transactionDate: { type: Date, default: Date.now },
    paymentMethod: { type: String, default: "" },
    notes: { type: String, default: "" },
    affectsSettlement: { type: Boolean, default: true },
    source: {
      type: String,
      enum: ["manual", "outing_sync"],
      default: "manual",
    },
  },
  { timestamps: true },
);

TransactionSchema.index({ type: 1, transactionDate: -1 });

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
