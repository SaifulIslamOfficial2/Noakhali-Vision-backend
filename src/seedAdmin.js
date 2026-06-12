import dotenv from "dotenv";
import connectDB from "./config/db.js";
import User from "./models/User.js";

dotenv.config();
await connectDB();

const email = "noakhalivision1@gmail.com";
const password = "46552@#";
const name = "Noakhali Vision Admin";

const existing = await User.findOne({ email });

if (existing) {
  existing.name = name;
  existing.password = password;
  existing.role = "admin";
  await existing.save();
  console.log("Admin user updated successfully");
} else {
  await User.create({ name, email, password, role: "admin" });
  console.log("Admin user created successfully");
}

process.exit(0);
