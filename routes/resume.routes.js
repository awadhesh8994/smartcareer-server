import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createResume, getResumes, getResumeById,
  updateResume, deleteResume, checkAtsScore,
  improveBullet, exportPdf, uploadParsedResume,
  uploadResumeMemory,
} from "../controllers/resume.controller.js";

const router = express.Router();
router.use(protect);

router.post("/",                    createResume);
router.get("/",                     getResumes);
router.post("/improve-bullet",      improveBullet);
router.post("/upload-parse",        uploadResumeMemory.single("resume"), uploadParsedResume);
router.get("/:id",                  getResumeById);
router.put("/:id",                  updateResume);
router.delete("/:id",               deleteResume);
router.post("/:id/ats-score",       checkAtsScore);
router.get("/:id/export-pdf",       exportPdf);

export default router;
