import { Router } from "express";
import { getComments, addComment, deleteComment } from "../controllers/commentController.js";
import { protect } from "../middleware/auth.js";
const router = Router();
router.get("/:slug", getComments);
router.post("/:slug", addComment);
router.delete("/:id", protect, deleteComment);
export default router;
