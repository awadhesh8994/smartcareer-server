import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "My Resume" },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },

    // ── Personal Info ─────────────────────────────────
    personalInfo: {
      name: String,
      email: String,
      phone: String,
      location: String,
      linkedin: String,
      github: String,
      portfolio: String,
      summary: { type: String, maxlength: 1000 },
    },

    // ── Experience ────────────────────────────────────
    experience: [
      {
        company: String,
        role: String,
        location: String,
        startDate: String,
        endDate: String,
        isCurrently: { type: Boolean, default: false },
        bullets: [String],
        type: { type: String, enum: ["full-time", "part-time", "internship", "contract"] },
      },
    ],

    // ── Education ─────────────────────────────────────
    education: [
      {
        institution: String,
        degree: String,
        fieldOfStudy: String,
        startYear: String,
        endYear: String,
        cgpa: String,
        achievements: [String],
      },
    ],

    // ── Skills ────────────────────────────────────────
    skills: {
      technical: [String],
      soft: [String],
      tools: [String],
      languages: [String],
    },

    // ── Projects ──────────────────────────────────────
    projects: [
      {
        name: String,
        description: String,
        techStack: [String],
        liveLink: String,
        githubLink: String,
        bullets: [String],
      },
    ],

    // ── Certifications ────────────────────────────────
    certifications: [
      {
        name: String,
        issuer: String,
        date: String,
        credentialUrl: String,
      },
    ],

    // ── ATS Analysis ──────────────────────────────────
    atsScore: { type: Number, default: 0, min: 0, max: 100 },
    atsKeywordsMissing: [String],
    atsSuggestions: [String],
    lastJobDescription: String,       // JD used for last ATS check

    // ── Template & Export ─────────────────────────────
    templateId: { type: String, default: "modern" },
    pdfUrl: { type: String, default: "" },
    lastExportedAt: Date,
  },
  { timestamps: true }
);

resumeSchema.index({ userId: 1, isActive: 1 });

const Resume = mongoose.model("Resume", resumeSchema);
export default Resume;
