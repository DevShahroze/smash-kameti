import mongoose from "mongoose";
import { ALLOCATION_TYPES } from "@/lib/constants";

const ExpenseAllocationSchema = new mongoose.Schema(
  {
    outingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Outing",
      index: true,
    },
    participantKind: { type: String, enum: ["member", "guest"], required: true },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    participantNameSnapshot: { type: String, required: true },
    allocationType: {
      type: String,
      enum: Object.values(ALLOCATION_TYPES),
      required: true,
    },
    amountPaisa: { type: Number, required: true },
    parcelId: { type: mongoose.Schema.Types.ObjectId, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

if (mongoose.models.ExpenseAllocation) {
  delete mongoose.models.ExpenseAllocation;
}

export default mongoose.model("ExpenseAllocation", ExpenseAllocationSchema);
