import { Router } from "express";
import { rss } from "../controllers/rssController.js";
const router = Router();
router.get("/", rss);
export default router;
