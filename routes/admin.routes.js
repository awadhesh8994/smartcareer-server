import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";
import {
  getAllUsers, updateUserRole, deleteUser,
  getPlatformStats, getQuestionBank, addQuestion, deleteQuestion,
  getAllForumPosts, deleteForumPost,
  getPendingRecruiters, approveRecruiter, rejectRecruiter,
} from "../controllers/admin.controller.js";

const router = express.Router();
router.use(protect, restrictTo("admin"));

// Users
router.get("/users",                      getAllUsers);
router.patch("/users/:id/role",           updateUserRole);
router.delete("/users/:id",               deleteUser);

// Recruiter approvals
router.get("/recruiters/pending",         getPendingRecruiters);
router.patch("/recruiters/:id/approve",   approveRecruiter);
router.patch("/recruiters/:id/reject",    rejectRecruiter);

// Platform
router.get("/stats",                      getPlatformStats);
router.get("/questions",                  getQuestionBank);
router.post("/questions",                 addQuestion);
router.delete("/questions/:id",           deleteQuestion);
router.get("/forum",                      getAllForumPosts);
router.delete("/forum/:id",               deleteForumPost);

export default router;