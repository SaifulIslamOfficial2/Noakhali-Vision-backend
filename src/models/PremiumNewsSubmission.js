import mongoose from "mongoose";

const premiumNewsSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PremiumMember",
      required: true,
      index: true,
    },
    memberId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    featuredImage: { type: String, default: "" },
    location: { type: String, required: true, trim: true },
    shortNews: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    adminNote: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("PremiumNewsSubmission", premiumNewsSchema);
