import mongoose from "mongoose";

const schema = new mongoose.Schema({
  name:         { type: String, required: true },
  slug:         { type: String, required: true, unique: true, lowercase: true },
  logo:         { type: String, default: "" },
  description:  { type: String, required: true },
  website:      { type: String, default: "" },
  contactEmail: { type: String, default: "" },
  status:       { type: String, enum: ["active", "draft"], default: "active" },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.model("Company", schema);
