import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";

// ── Chat Router ───────────────────────────────────────────────────
import {
  sendMessage, getChatHistory, clearHistory,
} from "../controllers/chat.controller.js";

export const chatRouter = express.Router();
chatRouter.use(protect);
chatRouter.post("/message",   sendMessage);
chatRouter.get("/history",    getChatHistory);
chatRouter.delete("/history", clearHistory);


// ── Network Router ────────────────────────────────────────────────
import {
  getMentors, sendMentorRequest, respondToRequest,
  getMyMentors, getMyStudents,
  getForumPosts, createForumPost, replyToPost, likePost,
  getLeaderboard,
} from "../controllers/network.controller.js";

export const networkRouter = express.Router();
networkRouter.use(protect);

// Mentor routes
networkRouter.get("/mentors",                   getMentors);
networkRouter.post("/mentor-request",           sendMentorRequest);
networkRouter.patch("/mentor-request/:id",      respondToRequest);
networkRouter.get("/my-mentors",                getMyMentors);
networkRouter.get("/my-students",               getMyStudents);

// Forum routes
networkRouter.get("/forum",                     getForumPosts);
networkRouter.post("/forum",                    createForumPost);
networkRouter.post("/forum/:id/reply",          replyToPost);
networkRouter.post("/forum/:id/like",           likePost);

// Leaderboard
networkRouter.get("/leaderboard",               getLeaderboard);


// ── Notification Router ───────────────────────────────────────────
import {
  getNotifications, markAsRead, markAllRead, deleteNotification,
} from "../controllers/notification.controller.js";

export const notificationRouter = express.Router();
notificationRouter.use(protect);
notificationRouter.get("/",          getNotifications);
notificationRouter.patch("/:id/read", markAsRead);
notificationRouter.patch("/read-all", markAllRead);
notificationRouter.delete("/:id",    deleteNotification);


// ── Admin Router ──────────────────────────────────────────────────
import {
  getAllUsers, updateUserRole, deleteUser,
  getPlatformStats, getQuestionBank,
  addQuestion, deleteQuestion,
  getAllForumPosts, deleteForumPost,
} from "../controllers/admin.controller.js";

export const adminRouter = express.Router();
adminRouter.use(protect, restrictTo("admin"));

adminRouter.get("/users",                 getAllUsers);
adminRouter.patch("/users/:id/role",      updateUserRole);
adminRouter.delete("/users/:id",          deleteUser);
adminRouter.get("/stats",                 getPlatformStats);
adminRouter.get("/questions",             getQuestionBank);
adminRouter.post("/questions",            addQuestion);
adminRouter.delete("/questions/:id",      deleteQuestion);
adminRouter.get("/forum",                 getAllForumPosts);
adminRouter.delete("/forum/:id",          deleteForumPost);
