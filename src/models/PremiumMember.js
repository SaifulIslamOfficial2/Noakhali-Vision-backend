import mongoose from "mongoose";
import Counter from "./Counter.js";

const STATUSES = ["Pending", "Active", "Rejected", "Suspended", "Expired"];

const premiumMemberSchema = new mongoose.Schema(
  {
    memberId: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    photo: { type: String, default: "" },
    facebookUrl: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    address: { type: String, required: true, trim: true },
    bio: { type: String, required: true, trim: true },
    bkashSenderNumber: { type: String, required: true, trim: true },
    transactionId: { type: String, required: true, unique: true, trim: true },
    paymentScreenshot: { type: String, default: "" },
    membershipStatus: {
      type: String,
      enum: STATUSES,
      default: "Pending",
      index: true,
    },
    joinDate: { type: Date },
    expiryDate: { type: Date, index: true },
    newsCount: { type: Number, default: 0 },
    publishedNewsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Auto-generate sequential Member ID: NV-0001, NV-0002, …
premiumMemberSchema.pre("validate", async function (next) {
  if (this.memberId) return next();
  try {
    const counter = await Counter.findByIdAndUpdate(
      "premiumMember",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.memberId = `NV-${String(counter.seq).padStart(4, "0")}`;
    next();
  } catch (err) {
    next(err);
  }
});

// Recalculate news counts from PremiumNewsSubmission
premiumMemberSchema.methods.recalcNews = async function () {
  const PNS = mongoose.model("PremiumNewsSubmission");
  const [newsCount, publishedNewsCount] = await Promise.all([
    PNS.countDocuments({ member: this._id }),
    PNS.countDocuments({ member: this._id, status: "Approved" }),
  ]);
  this.newsCount = newsCount;
  this.publishedNewsCount = publishedNewsCount;
  return this.save();
};

export default mongoose.model("PremiumMember", premiumMemberSchema);
