import mongoose from "mongoose";
const schema = new mongoose.Schema({
  news:    { type: mongoose.Schema.Types.ObjectId, ref: "News", required: true, index: true },
  name:    { type: String, required: true, maxlength: 60 },
  content: { type: String, required: true, maxlength: 500 },
  approved:{ type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model("Comment", schema);
