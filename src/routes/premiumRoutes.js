import { Router } from "express";
import {
  activateMember, approveMember, approveNews,
  createMember, deleteMember, deletePremiumNews,
  getMember, getPremiumStats, listMembers,
  listPremiumNews, rejectMember, rejectNews,
  renewMember, searchMembers, submitNews,
  suspendMember, updateMember, updatePremiumNews,
  uploadScreenshot,
} from "../controllers/premiumController.js";
import { optionalProtect, protect } from "../middleware/auth.js";
import { upload, resizeSingle, resizeFields } from "../middleware/upload.js";

const router = Router();

// Stats
router.get("/stats", protect, getPremiumStats);

// Member list & search
router.get("/members", optionalProtect, listMembers);
router.get("/members/search", protect, searchMembers);
router.get("/members/:memberId", optionalProtect, getMember);

// Registration — photo 600×600, screenshot original
router.post(
  "/members",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 },
    { name: "paymentScreenshot", maxCount: 1 },
  ]),
  resizeFields({
    photo: "memberPhoto",
    profilePhoto: "memberPhoto",
    paymentScreenshot: "screenshot",
  }),
  createMember
);

// Admin: edit profile
router.put(
  "/members/:memberId",
  protect,
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "paymentScreenshot", maxCount: 1 },
  ]),
  resizeFields({
    photo: "memberPhoto",
    paymentScreenshot: "screenshot",
  }),
  updateMember
);

router.delete("/members/:memberId", protect, deleteMember);

// Status actions
router.patch("/members/:memberId/approve",   protect, approveMember);
router.patch("/members/:memberId/reject",    protect, rejectMember);
router.patch("/members/:memberId/suspend",   protect, suspendMember);
router.patch("/members/:memberId/activate",  protect, activateMember);
router.patch("/members/:memberId/renew",     protect, renewMember);

// Payment screenshot — keep original (just compress)
router.post(
  "/members/:memberId/payment-screenshot",
  protect,
  upload.single("paymentScreenshot"),
  resizeSingle("screenshot"),
  uploadScreenshot
);

// Premium news — image 1200×1500
router.post(
  "/members/:memberId/news",
  upload.single("featuredImage"),
  resizeSingle("premiumNews"),
  submitNews
);

router.get("/news", protect, listPremiumNews);

router.put(
  "/news/:newsId",
  protect,
  upload.single("featuredImage"),
  resizeSingle("premiumNews"),
  updatePremiumNews
);

router.patch("/news/:newsId/approve", protect, approveNews);
router.patch("/news/:newsId/reject",  protect, rejectNews);
router.delete("/news/:newsId",        protect, deletePremiumNews);

export default router;
