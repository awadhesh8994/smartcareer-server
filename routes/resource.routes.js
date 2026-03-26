import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";
import {
  getResources, submitResource, upvoteResource, markCompleted,
  getPendingResources, approveResource, rejectResource, pinResource, deleteResource,
} from "../controllers/resource.controller.js";

const router = express.Router();
router.use(protect);

// Public (authenticated)
router.get("/",                   getResources);
router.post("/",                  submitResource);
router.post("/:id/upvote",        upvoteResource);
router.post("/:id/complete",      markCompleted);

// Admin only
router.get("/pending",            restrictTo("admin"), getPendingResources);
router.patch("/:id/approve",      restrictTo("admin"), approveResource);
router.patch("/:id/reject",       restrictTo("admin"), rejectResource);
router.patch("/:id/pin",          restrictTo("admin"), pinResource);
router.delete("/:id",             restrictTo("admin"), deleteResource);

export default router;