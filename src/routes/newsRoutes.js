import { Router } from "express";
import {
  createNews, deleteNews, getNews,
  getNewsById, getNewsBySlug, updateNews, getRelatedNews,
} from "../controllers/newsController.js";
import { protect } from "../middleware/auth.js";
import { upload, resizeFields } from "../middleware/upload.js";

const router = Router();
const newsUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "gallery", maxCount: 10 },
]);
const newsResize = resizeFields({ image: "news", gallery: "news" });

// Public
router.get("/", getNews);
router.get("/slug/:slug", getNewsBySlug);
router.get("/related/:slug", getRelatedNews);
router.get("/id/:id", getNewsById);
router.get("/:id", getNewsById);

// Admin
router.post("/", protect, newsUpload, newsResize, createNews);
router.put("/:id", protect, newsUpload, newsResize, updateNews);
router.delete("/:id", protect, deleteNews);

export default router;
