import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getMentors, sendMentorRequest, respondToRequest,
  getMyMentors, getMyStudents,
  getForumPosts, createForumPost, replyToPost, likePost,
  getLeaderboard,
} from "../controllers/network.controller.js";

const router = express.Router();
router.use(protect);

// Mentor
router.get("/mentors",               getMentors);
router.post("/mentor-request",       sendMentorRequest);
router.patch("/mentor-request/:id",  respondToRequest);
router.get("/my-mentors",            getMyMentors);
router.get("/my-students",           getMyStudents);

// Forum
router.get("/forum",                 getForumPosts);
router.post("/forum",                createForumPost);
router.post("/forum/:id/reply",      replyToPost);
router.post("/forum/:id/like",       likePost);

// Leaderboard
router.get("/leaderboard",           getLeaderboard);

export default router;
