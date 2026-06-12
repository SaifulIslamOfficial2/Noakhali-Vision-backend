import mongoose from "mongoose";
const schema = new mongoose.Schema({
  title:    { type: String, required: true },
  slug:     { type: String, required: true, unique: true, lowercase: true },
  image:    { type: String, default: "" },
  gallery:  [{ type: String }],           // extra images array
  videoUrl: { type: String, default: "" }, // YouTube URL or embed
  location: { type: String, default: "" },
  content:  { type: String, required: true },
  category: { type: String, enum: ["রাজনীতি","খেলাধুলা","ব্যবসা","শিক্ষা","স্বাস্থ্য","বিনোদন","আন্তর্জাতিক","স্থানীয়","প্রযুক্তি","অর্থনীতি"], default: "স্থানীয়" },
  status:   { type: String, enum: ["draft","published"], default: "draft" },
  author:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
export default mongoose.model("News", schema);
