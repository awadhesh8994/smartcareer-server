import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createResume, getResumes, getResumeById,
  updateResume, patchResume, deleteResume,
  checkAtsScore, improveBullet,
  uploadParsedResume, uploadResumeMemory, exportPdf,
} from "../controllers/resume.controller.js";

const router = express.Router();
router.use(protect);

// Static routes FIRST (before /:id)
router.post("/",               createResume);
router.get("/",                getResumes);
router.post("/improve-bullet", improveBullet);
router.post("/upload-parse",   uploadResumeMemory.single("resume"), uploadParsedResume);

// Dynamic routes
router.get("/:id",             getResumeById);
router.put("/:id",             updateResume);
router.patch("/:id",           patchResume);        // ← safe partial update
router.delete("/:id",          deleteResume);
router.post("/:id/ats-score",  checkAtsScore);
router.get("/:id/export-pdf",  exportPdf);

export default router;