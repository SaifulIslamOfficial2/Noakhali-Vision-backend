import { Router } from "express";
import { trackVisit } from "../controllers/visitorController.js";

const router = Router();
router.post("/", trackVisit);
export default router;
