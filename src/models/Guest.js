import mongoose from "mongoose";

const GuestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

GuestSchema.index({ name: 1 });

export default mongoose.models.Guest || mongoose.model("Guest", GuestSchema);
