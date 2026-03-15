import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  startAssessment, submitAssessment,
  getAssessmentHistory, getAssessmentById,
  getDomainsForUser,
} from "../controllers/assessment.controller.js";

const router = express.Router();
router.use(protect);

router.get("/domains",     getDomainsForUser);
router.post("/start",      startAssessment);
router.post("/submit/:id", submitAssessment);
router.get("/history",     getAssessmentHistory);
router.get("/:id",         getAssessmentById);

export default router;