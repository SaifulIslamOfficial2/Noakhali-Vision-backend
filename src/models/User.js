import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ["admin", "editor"], default: "editor" },
}, { timestamps: true });

schema.pre("save", async function (n) {
  if (this.isModified("password")) this.password = await bcrypt.hash(this.password, 12);
  n();
});

schema.methods.comparePassword = function (p) {
  return bcrypt.compare(p, this.password);
};

export default mongoose.model("User", schema);
