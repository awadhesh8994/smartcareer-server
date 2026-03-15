import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getLearningPlan,
  generateStudyPlan,
  addBookmark,
  removeBookmark,
  addPlaylist,
  updateTopicProgress,
  markDailyGoal,
  updateStreak,
} from "../controllers/learning.controller.js";

const router = express.Router();

router.use(protect);

router.get("/",                          getLearningPlan);
router.post("/study-plan",               generateStudyPlan);
router.post("/bookmarks",                addBookmark);
router.delete("/bookmarks/:bookmarkId",  removeBookmark);
router.post("/playlists",                addPlaylist);
router.patch("/topics/:topicId",         updateTopicProgress);
router.patch("/daily-goal/:planId/:day", markDailyGoal);
router.post("/streak",                   updateStreak);

export default router;
