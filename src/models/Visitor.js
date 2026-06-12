import mongoose from "mongoose";

const schema = new mongoose.Schema({
  path:      { type: String, required: true },
  ip:        { type: String, required: true },
  userAgent: { type: String, default: "" },
  dateKey:   { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("Visitor", schema);
