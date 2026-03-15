import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getJobs, getJobById, getMatchedJobs,
  applyToJob, saveJob, getApplications,
  updateApplication, deleteApplication,
} from "../controllers/jobs.controller.js";

export const jobsRouter = express.Router();
jobsRouter.use(protect);

jobsRouter.get("/",                      getJobs);
jobsRouter.get("/matched",               getMatchedJobs);
jobsRouter.get("/applications",          getApplications);
jobsRouter.post("/applications/:id",     updateApplication);
jobsRouter.delete("/applications/:id",   deleteApplication);
jobsRouter.get("/:id",                   getJobById);
jobsRouter.post("/:id/apply",            applyToJob);
jobsRouter.post("/:id/save",             saveJob);
