import { Router } from "express";
import { login, changePassword } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
const r = Router();
r.post("/login", login);
r.put("/change-password", protect, changePassword);
export default r;
