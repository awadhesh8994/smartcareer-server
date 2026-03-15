import User from "../models/User.model.js";
import Assessment from "../models/Assessment.model.js";
import Roadmap from "../models/Roadmap.model.js";
import { Forum, AdminLog, Notification } from "../models/index.models.js";
import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  domain:      { type: String, required: true },
  question:    { type: String, required: true },
  options:     [String],
  correctAnswer: Number,
  difficulty:  { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
  topic:       String,
  explanation: String,
}, { timestamps: true });
const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);

// ── GET /api/admin/users ──────────────────────────────────────────
export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search, status } = req.query;
    const query = {};
    if (role)   query.role = role;
    if (status) query.recruiterStatus = status;
    if (search) query.$or = [
      { name:  { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    const total = await User.countDocuments(query);
    res.json({ success: true, data: users, total, pages: Math.ceil(total / Number(limit)) });
  } catch (e) { next(e); }
};

// ── GET /api/admin/recruiters/pending ─────────────────────────────
export const getPendingRecruiters = async (req, res, next) => {
  try {
    const recruiters = await User.find({ role: "recruiter", recruiterStatus: "pending" })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: recruiters, count: recruiters.length });
  } catch (e) { next(e); }
};

// ── PATCH /api/admin/recruiters/:id/approve ───────────────────────
export const approveRecruiter = async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: "recruiter" },
      { recruiterStatus: "active" },
      { new: true }
    ).select("-password");

    if (!user)
      return res.status(404).json({ success: false, message: "Recruiter not found." });

    // Notify recruiter
    await Notification.create({
      userId:  user._id,
      type:    "system",
      title:   "Recruiter Account Approved! 🎉",
      message: "Your recruiter account has been approved. You can now log in and start posting jobs.",
      link:    "/recruiter",
    });

    await AdminLog.create({
      adminId:    req.user._id,
      action:     "Approved recruiter account",
      targetType: "user",
      targetId:   req.params.id,
    });

    // Send email notification
    try {
      const { sendEmail } = await import("../services/email.service.js");
      await sendEmail({
        to:      user.email,
        subject: "Your Recruiter Account is Approved — CareerAI",
        html:    `<h2>Welcome to CareerAI Recruiters!</h2><p>Hi ${user.name}, your recruiter account for <strong>${user.companyName}</strong> has been approved. You can now log in and start posting jobs.</p><a href="${process.env.CLIENT_URL}/login">Log in now →</a>`,
      });
    } catch {}

    res.json({ success: true, data: user, message: "Recruiter approved successfully." });
  } catch (e) { next(e); }
};

// ── PATCH /api/admin/recruiters/:id/reject ────────────────────────
export const rejectRecruiter = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: "recruiter" },
      { recruiterStatus: "rejected" },
      { new: true }
    ).select("-password");

    if (!user)
      return res.status(404).json({ success: false, message: "Recruiter not found." });

    await Notification.create({
      userId:  user._id,
      type:    "system",
      title:   "Recruiter Application Update",
      message: reason || "Your recruiter application was not approved. Please contact support for more information.",
      link:    "/",
    });

    await AdminLog.create({
      adminId:    req.user._id,
      action:     "Rejected recruiter account",
      targetType: "user",
      targetId:   req.params.id,
    });

    res.json({ success: true, message: "Recruiter rejected." });
  } catch (e) { next(e); }
};

// ── PATCH /api/admin/users/:id/role ──────────────────────────────
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["student", "recruiter", "admin"].includes(role))
      return res.status(400).json({ success: false, message: "Invalid role." });

    const updateData = { role };
    if (role === "recruiter") updateData.recruiterStatus = "active";
    if (role === "student")   updateData.recruiterStatus = null;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    await AdminLog.create({ adminId: req.user._id, action: `Changed role to ${role}`, targetType: "user", targetId: req.params.id });
    res.json({ success: true, data: user });
  } catch (e) { next(e); }
};

// ── DELETE /api/admin/users/:id ───────────────────────────────────
export const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, message: "Cannot delete your own account." });
    await User.findByIdAndDelete(req.params.id);
    await AdminLog.create({ adminId: req.user._id, action: "Deleted user", targetType: "user", targetId: req.params.id });
    res.json({ success: true, message: "User deleted." });
  } catch (e) { next(e); }
};

// ── GET /api/admin/stats ──────────────────────────────────────────
export const getPlatformStats = async (req, res, next) => {
  try {
    const [totalUsers, totalAssessments, totalRoadmaps, totalForumPosts,
           newUsersThisWeek, pendingRecruiters] = await Promise.all([
      User.countDocuments(),
      Assessment.countDocuments({ status: "completed" }),
      Roadmap.countDocuments(),
      Forum.countDocuments(),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      User.countDocuments({ role: "recruiter", recruiterStatus: "pending" }),
    ]);
    const domainStats = await Assessment.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: "$domain", count: { $sum: 1 }, avgScore: { $avg: "$score" } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data: { totalUsers, totalAssessments, totalRoadmaps, totalForumPosts, newUsersThisWeek, pendingRecruiters, domainStats } });
  } catch (e) { next(e); }
};

// ── Question bank ─────────────────────────────────────────────────
export const getQuestionBank = async (req, res, next) => {
  try {
    const { domain, difficulty } = req.query;
    const query = {};
    if (domain)     query.domain = domain;
    if (difficulty) query.difficulty = difficulty;
    const questions = await Question.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: questions });
  } catch (e) { next(e); }
};

export const addQuestion = async (req, res, next) => {
  try {
    const q = await Question.create(req.body);
    res.status(201).json({ success: true, data: q });
  } catch (e) { next(e); }
};

export const deleteQuestion = async (req, res, next) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Question deleted." });
  } catch (e) { next(e); }
};

export const getAllForumPosts = async (req, res, next) => {
  try {
    const posts = await Forum.find().populate("authorId", "name email").sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: posts });
  } catch (e) { next(e); }
};

export const deleteForumPost = async (req, res, next) => {
  try {
    await Forum.findByIdAndDelete(req.params.id);
    await AdminLog.create({ adminId: req.user._id, action: "Deleted forum post", targetType: "forum", targetId: req.params.id });
    res.json({ success: true, message: "Post deleted." });
  } catch (e) { next(e); }
};