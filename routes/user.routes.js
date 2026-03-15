import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import User from "../models/User.model.js";
import Assessment from "../models/Assessment.model.js";
import Roadmap from "../models/Roadmap.model.js";

const router = express.Router();
router.use(protect);

// ── GET /api/users/profile ────────────────────────────────────────
router.get("/profile", (req, res) => {
  res.json({ success: true, data: req.user });
});

// ── PUT /api/users/profile ────────────────────────────────────────
router.put("/profile", async (req, res, next) => {
  try {
    const allowed = ["name", "phone", "location", "bio", "careerGoal",
      "interestedDomains", "targetRole", "experienceLevel",
      "linkedinUrl", "githubUsername", "portfolioUrl", "education", "skills"];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findById(req.user._id);
    Object.assign(user, updates);
    user.calculateProfileScore();
    await user.save();

    res.json({ success: true, data: user });
  } catch (error) { next(error); }
});

// ── POST /api/users/avatar ────────────────────────────────────────
router.post("/avatar", async (req, res, next) => {
  try {
    // Cloudinary URL passed from frontend after direct upload, or file upload
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ success: false, message: "Avatar URL required." });
    const user = await User.findByIdAndUpdate(req.user._id, { avatar }, { new: true });
    res.json({ success: true, data: { avatar: user.avatar } });
  } catch (error) { next(error); }
});

// ── GET /api/users/stats ──────────────────────────────────────────
router.get("/stats", async (req, res, next) => {
  try {
    const [assessments, roadmap] = await Promise.all([
      Assessment.find({ userId: req.user._id, status: "completed" })
        .select("domain score skillLevel completedAt")
        .sort({ completedAt: -1 }),
      Roadmap.findOne({ userId: req.user._id, isActive: true })
        .select("overallProgress targetRole milestones"),
    ]);

    res.json({
      success: true,
      data: {
        profileScore:      req.user.profileCompletionScore,
        totalAssessments:  assessments.length,
        avgScore:          assessments.length
          ? Math.round(assessments.reduce((s, a) => s + a.score, 0) / assessments.length)
          : 0,
        roadmapProgress:   roadmap?.overallProgress || 0,
        targetRole:        roadmap?.targetRole || req.user.targetRole || "",
        streak:            req.user.streak,
        skills:            req.user.skills,
        recentAssessments: assessments.slice(0, 5),
      },
    });
  } catch (error) { next(error); }
});

// ── DELETE /api/users/account ─────────────────────────────────────
router.delete("/account", async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ success: true, message: "Account deleted." });
  } catch (error) { next(error); }
});

export default router;

// ── PATCH /api/users/onboarding ───────────────────────────────────
router.patch("/onboarding", async (req, res, next) => {
  try {
    const { userType, field, goal, targetRole, experienceLevel } = req.body;
    if (!userType || !field || !goal)
      return res.status(400).json({ success: false, message: "userType, field and goal are required." });

    const user = await User.findById(req.user._id);
    user.userType        = userType;
    user.field           = field;
    user.goal            = goal;
    user.onboarded       = true;
    if (targetRole)      user.targetRole      = targetRole;
    if (experienceLevel) user.experienceLevel = experienceLevel;
    user.calculateProfileScore();
    await user.save();

    res.json({ success: true, data: user });
  } catch (e) { next(e); }
});