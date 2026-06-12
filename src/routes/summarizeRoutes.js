import express from "express";
import { summarize, summarizeStatus, generateTitle } from "../controllers/summarizeController.js";
const router = express.Router();
router.post("/", summarize);
router.post("/title", generateTitle);
router.get("/status", summarizeStatus);
export default router;
