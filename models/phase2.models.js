import mongoose from "mongoose";

// ── Job Model ─────────────────────────────────────────────────────
const jobSchema = new mongoose.Schema(
  {
    // Source
    source:      { type: String, enum: ["api", "recruiter"], default: "api" },
    externalId:  String,                       // ID from JSearch API
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Core info
    title:       { type: String, required: true },
    company:     { type: String, required: true },
    companyLogo: String,
    location:    { type: String, default: "" },
    country:     { type: String, default: "India" },
    type:        { type: String, enum: ["full-time", "part-time", "internship", "contract", "remote"], default: "full-time" },
    isRemote:    { type: Boolean, default: false },

    // Details
    description:      String,
    requirements:     [String],
    skillsRequired:   [String],
    experienceLevel:  { type: String, enum: ["Fresher", "0-1 years", "1-2 years", "2-5 years", "5+ years"], default: "Fresher" },

    // Salary
    salary: {
      min:      Number,
      max:      Number,
      currency: { type: String, default: "INR" },
      period:   { type: String, default: "monthly" },
    },

    // Apply
    applyLink: String,
    postedAt:  { type: Date, default: Date.now },
    expiresAt: Date,
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

jobSchema.index({ title: "text", company: "text", description: "text" });
jobSchema.index({ skillsRequired: 1 });
jobSchema.index({ source: 1, isActive: 1 });

// ── Application Model ─────────────────────────────────────────────
const applicationSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    jobId:     { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    status:    {
      type: String,
      enum: ["saved", "applied", "shortlisted", "interview", "rejected", "offered"],
      default: "saved",
    },
    fitScore:   { type: Number, min: 0, max: 100 },
    fitReasons: [String],
    notes:      String,
    appliedAt:  Date,
  },
  { timestamps: true }
);

applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });

// ── Recruiter Model ───────────────────────────────────────────────
const recruiterSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    companyName: { type: String, required: true },
    website:     String,
    industry:    String,
    about:       String,
    logo:        String,
    verified:    { type: Boolean, default: false },
    postedJobs:  [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
  },
  { timestamps: true }
);

// ── Interview Model ───────────────────────────────────────────────
const interviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role:   { type: String, required: true },
    type:   { type: String, enum: ["HR", "Technical", "Mixed"], default: "Mixed" },

    questions: [
      {
        question:         String,
        expectedKeywords: [String],
        difficulty:       String,
        category:         String,
      },
    ],

    answers: [
      {
        questionIndex:  Number,
        questionText:   String,
        userAnswer:     String,
        aiScore:        { type: Number, min: 0, max: 10 },
        aiFeedback:     String,
        starScore:      Number,
        keywordsFound:  [String],
      },
    ],

    overallScore:    { type: Number, min: 0, max: 100 },
    overallFeedback: String,
    strengths:       [String],
    improvements:    [String],
    status:          { type: String, enum: ["in-progress", "completed"], default: "in-progress" },
    completedAt:     Date,
  },
  { timestamps: true }
);

interviewSchema.index({ userId: 1, createdAt: -1 });

export const Job          = mongoose.model("Job",         jobSchema);
export const Application  = mongoose.model("Application", applicationSchema);
export const Recruiter    = mongoose.model("Recruiter",   recruiterSchema);
export const Interview    = mongoose.model("Interview",   interviewSchema);
