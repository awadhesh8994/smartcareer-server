import Roadmap from "../models/Roadmap.model.js";
import { generateCareerRoadmap } from "../services/claude.service.js";

// ── POST /api/roadmaps/generate ───────────────────────────────────
export const generateRoadmap = async (req, res, next) => {
  try {
    const { targetRole } = req.body;
    if (!targetRole)
      return res.status(400).json({ success: false, message: "Target role is required." });

    const currentSkills  = req.user.skills?.map(s => s.name) || [];
    const experienceLevel = req.user.experienceLevel || "Fresher";

    // Deactivate old roadmaps
    await Roadmap.updateMany({ userId: req.user._id }, { isActive: false });

    let roadmapData;
    try {
      roadmapData = await generateCareerRoadmap({ targetRole, currentSkills, experienceLevel });
    } catch (aiErr) {
      console.warn("⚠️  Claude API error, using fallback roadmap:", aiErr.message);
      // Fallback static roadmap
      roadmapData = {
        summary: `A personalised roadmap to become a ${targetRole}.`,
        milestones: [
          { title: "Foundation & Setup", description: "Set up your dev environment and learn the basics.", order: 1, estimatedDays: 7, resources: [] },
          { title: "Core Skills", description: "Build core skills needed for the role.", order: 2, estimatedDays: 21, resources: [] },
          { title: "Projects & Practice", description: "Build real projects and practise daily.", order: 3, estimatedDays: 30, resources: [] },
          { title: "Interview Prep", description: "Prepare for technical and HR interviews.", order: 4, estimatedDays: 14, resources: [] },
        ],
        alternativePaths: [],
      };
    }

    const roadmap = await Roadmap.create({
      userId: req.user._id,
      targetRole,
      currentSkills,
      milestones:       roadmapData.milestones,
      alternativePaths: roadmapData.alternativePaths || [],
      summary:          roadmapData.summary,
      isActive:         true,
    });

    res.status(201).json({ success: true, data: roadmap });
  } catch (error) { next(error); }
};

// ── GET /api/roadmaps ─────────────────────────────────────────────
export const getRoadmap = async (req, res, next) => {
  try {
    const roadmap = await Roadmap.findOne({ userId: req.user._id, isActive: true });
    if (!roadmap)
      return res.status(404).json({ success: false, message: "No active roadmap found." });
    res.json({ success: true, data: roadmap });
  } catch (error) { next(error); }
};

// ── PATCH /api/roadmaps/milestone/:milestoneId ────────────────────
export const updateMilestone = async (req, res, next) => {
  try {
    const { completed, notes } = req.body;
    const roadmap = await Roadmap.findOne({ userId: req.user._id, isActive: true });
    if (!roadmap)
      return res.status(404).json({ success: false, message: "Roadmap not found." });

    const milestone = roadmap.milestones.id(req.params.milestoneId);
    if (!milestone)
      return res.status(404).json({ success: false, message: "Milestone not found." });

    if (completed !== undefined) {
      milestone.completed  = completed;
      milestone.completedAt = completed ? new Date() : undefined;
    }
    if (notes !== undefined) milestone.notes = notes;

    // Recalculate progress
    const done = roadmap.milestones.filter(m => m.completed).length;
    roadmap.overallProgress = Math.round((done / roadmap.milestones.length) * 100);

    await roadmap.save();
    res.json({ success: true, data: roadmap });
  } catch (error) { next(error); }
};

// ── DELETE /api/roadmaps/:id ──────────────────────────────────────
export const deleteRoadmap = async (req, res, next) => {
  try {
    await Roadmap.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: "Roadmap deleted." });
  } catch (error) { next(error); }
};
