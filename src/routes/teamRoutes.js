import { Router } from "express";
import { getTeam, createMember, updateMember, deleteMember } from "../controllers/teamController.js";
import { protect } from "../middleware/auth.js";
import { upload, resizeSingle } from "../middleware/upload.js";

const router = Router();

// Public
router.get("/", getTeam);

// Admin
router.post("/", protect, upload.single("photo"), resizeSingle("memberPhoto"), createMember);
router.put("/:id", protect, upload.single("photo"), resizeSingle("memberPhoto"), updateMember);
router.delete("/:id", protect, deleteMember);

export default router;
