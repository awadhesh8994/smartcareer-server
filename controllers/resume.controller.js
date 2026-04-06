import { createRequire } from "module";
const require = createRequire(import.meta.url);

import Resume from "../models/Resume.model.js";
import { checkATS, improveBulletPoint } from "../services/claude.service.js";
import multer from "multer";

export const uploadResumeMemory = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"));
  },
});

// ── POST /api/resumes ─────────────────────────────────────────────
export const createResume = async (req, res, next) => {
  try {
    const count  = await Resume.countDocuments({ userId: req.user._id });
    const resume = await Resume.create({ ...req.body, userId: req.user._id, version: count + 1 });
    res.status(201).json({ success: true, data: resume });
  } catch (e) { next(e); }
};

// ── GET /api/resumes ──────────────────────────────────────────────
export const getResumes = async (req, res, next) => {
  try {
    const resumes = await Resume.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: resumes });
  } catch (e) { next(e); }
};

// ── GET /api/resumes/:id ──────────────────────────────────────────
export const getResumeById = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: "Resume not found." });
    res.json({ success: true, data: resume });
  } catch (e) { next(e); }
};

// ── PUT /api/resumes/:id — full replace ───────────────────────────
export const updateResume = async (req, res, next) => {
  try {
    const { userId, _id, __v, createdAt, ...updateData } = req.body;
    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: updateData },
      { new: true, runValidators: false }
    );
    if (!resume) return res.status(404).json({ success: false, message: "Resume not found." });
    res.json({ success: true, data: resume });
  } catch (e) { next(e); }
};

// ── PATCH /api/resumes/:id — partial update (safe merge) ──────────
export const patchResume = async (req, res, next) => {
  try {
    // Build dot-notation $set to safely merge nested fields
    const buildDotNotation = (obj, prefix = "") => {
      return Object.entries(obj).reduce((acc, [key, val]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (val !== null && typeof val === "object" && !Array.isArray(val)) {
          Object.assign(acc, buildDotNotation(val, path));
        } else {
          acc[path] = val;
        }
        return acc;
      }, {});
    };

    const { userId, _id, __v, createdAt, updatedAt, ...fields } = req.body;
    const dotFields = buildDotNotation(fields);

    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: dotFields },
      { new: true, runValidators: false }
    );
    if (!resume) return res.status(404).json({ success: false, message: "Resume not found." });
    res.json({ success: true, data: resume });
  } catch (e) { next(e); }
};

// ── DELETE /api/resumes/:id ───────────────────────────────────────
export const deleteResume = async (req, res, next) => {
  try {
    await Resume.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: "Resume deleted." });
  } catch (e) { next(e); }
};

// ── POST /api/resumes/:id/ats-score ──────────────────────────────
export const checkAtsScore = async (req, res, next) => {
  try {
    const { jobDescription } = req.body;
    if (!jobDescription)
      return res.status(400).json({ success: false, message: "Job description is required." });

    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: "Resume not found." });

    let result;
    try {
      result = await checkATS({ resume, jobDescription });
    } catch (aiErr) {
      console.warn("⚠️  ATS check AI error:", aiErr.message);
      result = {
        score: 50,
        missingKeywords: [],
        suggestions: [
          "Add more relevant keywords from the job description.",
          "Quantify your achievements with numbers.",
          "Match the exact job title in your resume.",
        ],
        sectionFeedback: {},
      };
    }

    await Resume.findByIdAndUpdate(req.params.id, {
      atsScore:           result.score,
      atsKeywordsMissing: result.missingKeywords || [],
      atsSuggestions:     result.suggestions || [],
      lastJobDescription: jobDescription,
    });

    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

// ── POST /api/resumes/improve-bullet ─────────────────────────────
export const improveBullet = async (req, res, next) => {
  try {
    const { bullet, role } = req.body;
    if (!bullet)
      return res.status(400).json({ success: false, message: "Bullet text is required." });

    let result;
    try {
      result = await improveBulletPoint({ bullet, role });
    } catch (aiErr) {
      console.warn("⚠️  Bullet improve AI error:", aiErr.message);
      result = {
        original: bullet,
        improved: [
          `Developed and implemented ${bullet.toLowerCase()} resulting in improved outcomes`,
          `Successfully delivered ${bullet.toLowerCase()}, enhancing team efficiency by measurable impact`,
          `Led initiative for ${bullet.toLowerCase()}, driving results across key metrics`,
        ],
        tips: "Start with strong action verbs and quantify your achievements.",
      };
    }

    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

// ── POST /api/resumes/upload-parse ────────────────────────────────
export const uploadParsedResume = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded." });
    const pdfParse = require("pdf-parse");
    const parsed   = await pdfParse(req.file.buffer);
    res.json({ success: true, data: { text: parsed.text, pages: parsed.numpages } });
  } catch (e) { next(e); }
};

// ── GET /api/resumes/:id/export-pdf ──────────────────────────────
export const exportPdf = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: "Resume not found." });
    res.json({ success: true, data: resume });
  } catch (e) { next(e); }
};