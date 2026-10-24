import mongoose from "mongoose";
import { ACCOUNTING_MODES } from "@/lib/constants";

const GroupSettingsSchema = new mongoose.Schema(
  {
    accountingMode: {
      type: String,
      enum: Object.values(ACCOUNTING_MODES),
      default: ACCOUNTING_MODES.EXPENSE_BASED,
    },
    currency: { type: String, default: "PKR" },
    groupName: { type: String, default: "Smash Kameti" },
  },
  { timestamps: true },
);

export default mongoose.models.GroupSettings ||
  mongoose.model("GroupSettings", GroupSettingsSchema);
