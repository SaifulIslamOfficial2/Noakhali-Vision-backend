import mongoose from "mongoose";

const schema = new mongoose.Schema({
  title:     { type: String, required: true },
  image:     { type: String, required: true },
  link:      { type: String, default: "" },
  placement: { type: String, enum: ["homepage", "news-details", "company", "partnership", "all"], default: "homepage" },
  adType:    { type: String, enum: ["banner", "square"], default: "banner" },
  status:    { type: String, enum: ["active", "draft"], default: "active" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.model("Ad", schema);
