import mongoose from "mongoose";

const schema = new mongoose.Schema({
  name:       { type: String, required: true },
  nameBn:     { type: String, default: "" },
  role:       { type: String, required: true },
  roleBn:     { type: String, default: "" },
  photo:      { type: String, default: "" },
  bio:        { type: String, default: "" },
  email:      { type: String, default: "" },
  facebook:   { type: String, default: "" },
  order:      { type: Number, default: 0 },
  active:     { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("TeamMember", schema);
