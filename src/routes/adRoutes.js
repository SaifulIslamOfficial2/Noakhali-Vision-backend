import { Router } from "express";
import { createAd, deleteAd, getAdById, getAds, updateAd } from "../controllers/adController.js";
import { authorize, optionalProtect, protect } from "../middleware/auth.js";
import { upload, resizeSingle } from "../middleware/upload.js";

const router = Router();

router.get("/",     optionalProtect, getAds);
router.get("/:id",  protect, getAdById);
router.post("/",    protect, authorize("admin", "editor"), upload.single("image"), resizeSingle("news"), createAd);
router.put("/:id",  protect, authorize("admin", "editor"), upload.single("image"), resizeSingle("news"), updateAd);
router.delete("/:id", protect, authorize("admin"), deleteAd);

export default router;
