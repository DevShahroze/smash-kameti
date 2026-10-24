import mongoose from "mongoose";

const VenueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

VenueSchema.index({ name: 1 });

export default mongoose.models.Venue || mongoose.model("Venue", VenueSchema);
