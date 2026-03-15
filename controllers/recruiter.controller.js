import { Job, Application, Recruiter } from "../models/phase2.models.js";
import User from "../models/User.model.js";
import { getJobFitScore } from "../services/claude.service.js";

// ── POST /api/recruiter/setup ─────────────────────────────────────
export const setupRecruiter = async (req, res, next) => {
  try {
    const { companyName, website, industry, about } = req.body;
    if (!companyName)
      return res.status(400).json({ success: false, message: "Company name is required." });

    let recruiter = await Recruiter.findOne({ userId: req.user._id });
    if (recruiter) {
      Object.assign(recruiter, { companyName, website, industry, about });
      await recruiter.save();
    } else {
      recruiter = await Recruiter.create({ userId: req.user._id, companyName, website, industry, about });
    }

    // Update user role to recruiter-like (we use student role but with recruiter profile)
    res.json({ success: true, data: recruiter });
  } catch (error) { next(error); }
};

// ── GET /api/recruiter/profile ────────────────────────────────────
export const getRecruiterProfile = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findOne({ userId: req.user._id });
    if (!recruiter)
      return res.status(404).json({ success: false, message: "Recruiter profile not found. Please set up first." });
    res.json({ success: true, data: recruiter });
  } catch (error) { next(error); }
};

// ── POST /api/recruiter/jobs ──────────────────────────────────────
export const postJob = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findOne({ userId: req.user._id });
    if (!recruiter)
      return res.status(400).json({ success: false, message: "Set up recruiter profile first." });

    const {
      title, company, location, type, isRemote,
      description, requirements, skillsRequired,
      experienceLevel, salary, applyLink, expiresAt,
    } = req.body;

    if (!title || !company)
      return res.status(400).json({ success: false, message: "Title and company are required." });

    const job = await Job.create({
      source: "recruiter",
      recruiterId: req.user._id,
      title, company, location, type, isRemote,
      description, requirements: requirements || [],
      skillsRequired: skillsRequired || [],
      experienceLevel, salary, applyLink, expiresAt,
    });

    recruiter.postedJobs.push(job._id);
    await recruiter.save();

    res.status(201).json({ success: true, data: job });
  } catch (error) { next(error); }
};

// ── GET /api/recruiter/jobs ───────────────────────────────────────
export const getRecruiterJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ recruiterId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: jobs });
  } catch (error) { next(error); }
};

// ── PUT /api/recruiter/jobs/:id ───────────────────────────────────
export const updateJob = async (req, res, next) => {
  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, recruiterId: req.user._id },
      req.body,
      { new: true }
    );
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });
    res.json({ success: true, data: job });
  } catch (error) { next(error); }
};

// ── DELETE /api/recruiter/jobs/:id ────────────────────────────────
export const deleteJob = async (req, res, next) => {
  try {
    await Job.findOneAndUpdate(
      { _id: req.params.id, recruiterId: req.user._id },
      { isActive: false }
    );
    res.json({ success: true, message: "Job removed." });
  } catch (error) { next(error); }
};

// ── GET /api/recruiter/jobs/:id/candidates ────────────────────────
export const getCandidates = async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, recruiterId: req.user._id });
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });

    // Get applicants
    const applications = await Application.find({ jobId: req.params.id })
      .populate("userId", "name email avatar skills education careerGoal targetRole experienceLevel profileCompletionScore")
      .sort({ fitScore: -1 });

    // If no applicants, suggest matched candidates from all students
    if (!applications.length) {
      const students = await User.find({ role: "student" })
        .select("name email avatar skills education targetRole experienceLevel profileCompletionScore")
        .limit(20);

      const scored = await Promise.all(
        students.map(async (student) => {
          let fitScore = 0;
          try {
            const result = await getJobFitScore({
              userSkills:      student.skills?.map(s => s.name) || [],
              targetRole:      student.targetRole || "",
              experienceLevel: student.experienceLevel || "Fresher",
              jobTitle:        job.title,
              jobSkills:       job.skillsRequired || [],
              jobDescription:  job.description || "",
            });
            fitScore = result.score;
          } catch {
            const jobText = `${job.title} ${job.skillsRequired.join(" ")}`.toLowerCase();
            const matches = (student.skills || []).filter(s => jobText.includes(s.name?.toLowerCase()));
            fitScore = Math.min(100, Math.round((matches.length / Math.max(job.skillsRequired.length, 1)) * 100));
          }
          return { student, fitScore, status: "suggested" };
        })
      );
      scored.sort((a, b) => b.fitScore - a.fitScore);
      return res.json({ success: true, data: scored.slice(0, 10), type: "suggested" });
    }

    res.json({ success: true, data: applications, type: "applied" });
  } catch (error) { next(error); }
};

// ── PATCH /api/recruiter/applications/:id ─────────────────────────
export const updateCandidateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("userId", "name email avatar");

    if (!application) return res.status(404).json({ success: false, message: "Application not found." });

    // Notify candidate
    const { Notification } = await import("../models/index.models.js");
    await Notification.create({
      userId:  application.userId._id,
      type:    "system",
      title:   status === "shortlisted" ? "You've been shortlisted! 🎉" : status === "interview" ? "Interview invitation! 🎤" : "Application update",
      message: `Your application status changed to: ${status}`,
      link:    "/jobs",
    });

    res.json({ success: true, data: application });
  } catch (error) { next(error); }
};

// ── GET /api/recruiter/dashboard ──────────────────────────────────
export const getRecruiterDashboard = async (req, res, next) => {
  try {
    const jobs = await Job.find({ recruiterId: req.user._id });
    const jobIds = jobs.map(j => j._id);

    const [totalApplications, shortlisted, interviews] = await Promise.all([
      Application.countDocuments({ jobId: { $in: jobIds } }),
      Application.countDocuments({ jobId: { $in: jobIds }, status: "shortlisted" }),
      Application.countDocuments({ jobId: { $in: jobIds }, status: "interview" }),
    ]);

    res.json({
      success: true,
      data: {
        totalJobs:        jobs.length,
        activeJobs:       jobs.filter(j => j.isActive).length,
        totalApplications,
        shortlisted,
        interviews,
      },
    });
  } catch (error) { next(error); }
};
