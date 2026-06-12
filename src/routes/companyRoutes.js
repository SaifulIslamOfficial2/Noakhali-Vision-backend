import { Router } from "express";
import { createCompany, deleteCompany, getCompanies, getCompanyById, updateCompany } from "../controllers/companyController.js";
import { authorize, optionalProtect, protect } from "../middleware/auth.js";
import { upload, resizeSingle } from "../middleware/upload.js";

const router = Router();

router.get("/",     optionalProtect, getCompanies);
router.get("/:id",  protect, getCompanyById);
router.post("/",    protect, authorize("admin", "editor"), upload.single("logo"), resizeSingle("news"), createCompany);
router.put("/:id",  protect, authorize("admin", "editor"), upload.single("logo"), resizeSingle("news"), updateCompany);
router.delete("/:id", protect, authorize("admin"), deleteCompany);

export default router;
