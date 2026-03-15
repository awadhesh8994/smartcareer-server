import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { restrictTo } from "../middleware/role.middleware.js";
import {
  setupRecruiter, getRecruiterProfile,
  postJob, getRecruiterJobs, updateJob, deleteJob,
  getCandidates, updateCandidateStatus, getRecruiterDashboard,
} from "../controllers/recruiter.controller.js";

const router = express.Router();

// Only active recruiters and admins can access recruiter routes
router.use(protect, restrictTo("recruiter", "admin"));

router.post("/setup",                  setupRecruiter);
router.get("/profile",                 getRecruiterProfile);
router.get("/dashboard",               getRecruiterDashboard);
router.post("/jobs",                   postJob);
router.get("/jobs",                    getRecruiterJobs);
router.put("/jobs/:id",                updateJob);
router.delete("/jobs/:id",             deleteJob);
router.get("/jobs/:id/candidates",     getCandidates);
router.patch("/applications/:id",      updateCandidateStatus);

export default router;