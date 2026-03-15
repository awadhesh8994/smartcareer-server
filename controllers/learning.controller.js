import LearningPlan from "../models/LearningPlan.model.js";
import { generateStudyPlanAI } from "../services/claude.service.js";

const getOrCreate = async (userId) => {
  let plan = await LearningPlan.findOne({ userId });
  if (!plan) plan = await LearningPlan.create({ userId });
  return plan;
};

// ── GET /api/learning ─────────────────────────────────────────────
export const getLearningPlan = async (req, res, next) => {
  try {
    const plan = await getOrCreate(req.user._id);
    res.json({ success: true, data: plan });
  } catch (error) { next(error); }
};

// ── POST /api/learning/study-plan ────────────────────────────────
export const generateStudyPlan = async (req, res, next) => {
  try {
    const { topic, daysAvailable } = req.body;
    if (!topic || !daysAvailable)
      return res.status(400).json({ success: false, message: "Topic and daysAvailable are required." });

    let aiPlan;
    try {
      aiPlan = await generateStudyPlanAI({ topic, daysAvailable, userLevel: req.user.experienceLevel });
    } catch (aiErr) {
      console.warn("⚠️  Study plan AI error:", aiErr.message);
      // Fallback plan
      const days = Math.min(Number(daysAvailable), 30);
      aiPlan = {
        planTitle: `Learn ${topic} in ${days} Days`,
        dailyGoals: Array.from({ length: days }, (_, i) => ({
          day: i + 1,
          tasks: [`Study ${topic} - Day ${i + 1}: ${i < days / 3 ? "Basics" : i < (days * 2) / 3 ? "Intermediate" : "Advanced"}`],
          resources: [],
          completed: false,
        })),
      };
    }

    const plan = await getOrCreate(req.user._id);
    // Deactivate old plans with same topic
    plan.studyPlans = plan.studyPlans.map(sp =>
      sp.generatedFor === topic ? { ...sp.toObject(), isActive: false } : sp
    );
    plan.studyPlans.push({
      planTitle:    aiPlan.planTitle,
      generatedFor: topic,
      daysAvailable: Number(daysAvailable),
      dailyGoals:   aiPlan.dailyGoals,
      isActive:     true,
    });
    await plan.save();
    res.json({ success: true, data: plan.studyPlans[plan.studyPlans.length - 1] });
  } catch (error) { next(error); }
};

// ── POST /api/learning/bookmarks ─────────────────────────────────
export const addBookmark = async (req, res, next) => {
  try {
    const plan = await getOrCreate(req.user._id);
    plan.bookmarks.push(req.body);
    await plan.save();
    res.json({ success: true, data: plan.bookmarks });
  } catch (error) { next(error); }
};

// ── DELETE /api/learning/bookmarks/:bookmarkId ────────────────────
export const removeBookmark = async (req, res, next) => {
  try {
    const plan = await getOrCreate(req.user._id);
    plan.bookmarks = plan.bookmarks.filter(b => b._id.toString() !== req.params.bookmarkId);
    await plan.save();
    res.json({ success: true, data: plan.bookmarks });
  } catch (error) { next(error); }
};

// ── POST /api/learning/playlists ─────────────────────────────────
export const addPlaylist = async (req, res, next) => {
  try {
    const plan = await getOrCreate(req.user._id);
    plan.playlists.push(req.body);
    await plan.save();
    res.json({ success: true, data: plan.playlists });
  } catch (error) { next(error); }
};

// ── PATCH /api/learning/topics/:topicId ──────────────────────────
export const updateTopicProgress = async (req, res, next) => {
  try {
    const plan  = await getOrCreate(req.user._id);
    const topic = plan.topics.id(req.params.topicId);
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found." });
    Object.assign(topic, req.body);
    await plan.save();
    res.json({ success: true, data: topic });
  } catch (error) { next(error); }
};

// ── PATCH /api/learning/daily-goal/:planId/:day ───────────────────
export const markDailyGoal = async (req, res, next) => {
  try {
    const plan      = await getOrCreate(req.user._id);
    const studyPlan = plan.studyPlans.id(req.params.planId);
    if (!studyPlan) return res.status(404).json({ success: false, message: "Plan not found." });
    const goal = studyPlan.dailyGoals.find(g => g.day === Number(req.params.day));
    if (goal) goal.completed = true;
    await plan.save();
    res.json({ success: true, data: studyPlan });
  } catch (error) { next(error); }
};

// ── POST /api/learning/streak ─────────────────────────────────────
export const updateStreak = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const plan  = await getOrCreate(req.user._id);
    if (!plan.streakDates.includes(today)) {
      plan.streakDates.push(today);
      plan.totalLearningDays  = (plan.totalLearningDays || 0) + 1;
      plan.lastStudiedAt      = new Date();
    }
    await plan.save();
    res.json({ success: true, data: { streakDates: plan.streakDates, totalDays: plan.totalLearningDays } });
  } catch (error) { next(error); }
};
