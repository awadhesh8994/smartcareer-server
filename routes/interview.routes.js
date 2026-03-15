import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  startInterview, submitAnswer, completeInterview,
  getInterviewHistory, getInterviewById,
} from "../controllers/interview.controller.js";

const router = express.Router();
router.use(protect);

router.post("/start",          startInterview);
router.get("/history",         getInterviewHistory);
router.get("/:id",             getInterviewById);
router.post("/:id/answer",     submitAnswer);
router.post("/:id/complete",   completeInterview);

export default router;
