import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  generateRoadmap,
  getRoadmap,
  updateMilestone,
  deleteRoadmap,
} from "../controllers/roadmap.controller.js";

const router = express.Router();

router.use(protect);

router.post("/generate",              generateRoadmap);
router.get("/",                       getRoadmap);
router.patch("/milestone/:milestoneId", updateMilestone);
router.delete("/:id",                 deleteRoadmap);

export default router;
