import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const normalizeExperienceLevel = (value) => {
  const normalised = typeof value === "string" ? value.trim() : value;

  switch (normalised) {
    case "Fresher":
      return "Student (Fresher)";
    case "1-2 years":
      return "1-3 years";
    case "2-5 years":
      return "3-5 years";
    case "5+ years":
      return "5-8 years";
    default:
      return normalised;
  }
};

const educationSchema = new mongoose.Schema({
  degree:       { type: String, required: true },
  institution:  { type: String, required: true },
  fieldOfStudy: String,
  startYear:    Number,
  endYear:      Number,
  cgpa:         Number,
  isCurrently:  { type: Boolean, default: false },
});

const skillSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  level:        { type: String, enum: ["Beginner", "Intermediate", "Advanced"], default: "Beginner" },
  verified:     { type: Boolean, default: false },
  endorsements: { type: Number, default: 0 },
});

const userSchema = new mongoose.Schema(
  {
    // ── Auth ───────────────────────────────────────────
    name:             { type: String, required: true, trim: true, maxlength: 100 },
    email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:         { type: String, minlength: 6, select: false },
    googleId:         { type: String, sparse: true },
    isEmailVerified:  { type: Boolean, default: false },

    // ── Role ───────────────────────────────────────────
    role:             { type: String, enum: ["student", "recruiter", "admin"], default: "student" },
    recruiterStatus:  { type: String, enum: ["pending", "active", "rejected"], default: null },
    companyName:      { type: String, default: "" },

    // ── Onboarding ─────────────────────────────────────
    onboarded:  { type: Boolean, default: false },
    userType:   {
      type: String,
      enum: ["Student", "Working Professional", "Career Switcher", "Freelancer / Entrepreneur"],
      default: null,
    },
    field: {
      type: String,
      enum: [
        "Technology", "Business & Management", "Finance & Accounting",
        "Law & Legal", "Arts & Design", "Marketing & Media",
        "Healthcare & Medicine", "Engineering (Non-CS)",
        "Education", "Science & Research", "Other",
      ],
      default: null,
    },
    goal: {
      type: String,
      enum: [
        "Get my first job", "Switch to a new career",
        "Get promoted / grow in current role", "Build new skills / upskill",
        "Pass a certification or exam", "Start my own business",
      ],
      default: null,
    },

    // ── Profile ────────────────────────────────────────
    avatar:          { type: String, default: "" },
    phone:           { type: String, default: "" },
    location:        { type: String, default: "" },
    bio:             { type: String, maxlength: 500, default: "" },
    linkedinUrl:     { type: String, default: "" },
    githubUsername:  { type: String, default: "" },
    portfolioUrl:    { type: String, default: "" },

    // ── Professional ───────────────────────────────────
    currentCompany:  { type: String, default: "" },
    currentTitle:    { type: String, default: "" },
    industry:        { type: String, default: "" },
    lookingFor:      {
      type: String,
      enum: ["New job", "Promotion", "Career switch", "Upskilling only", "Networking"],
      default: "New job",
    },

    // ── Academic ───────────────────────────────────────
    education: [educationSchema],
    skills:    [skillSchema],

    // ── Career ────────────────────────────────────────
    careerGoal:        { type: String, default: "" },
    interestedDomains: [{ type: String }],
    targetRole:        { type: String, default: "" },
    experienceLevel:   {
      type: String,
      enum: ["Student (Fresher)", "0-1 years", "1-3 years", "3-5 years", "5-8 years", "8+ years"],
      default: "Student (Fresher)",
      set: normalizeExperienceLevel,
    },

    // ── Completion ─────────────────────────────────────
    profileCompletionScore: { type: Number, default: 0, min: 0, max: 100 },
    isProfileComplete:      { type: Boolean, default: false },

    // ── Streak ─────────────────────────────────────────
    streak: {
      current:        { type: Number, default: 0 },
      longest:        { type: Number, default: 0 },
      lastActiveDate: { type: Date },
    },

    // ── Password Reset ─────────────────────────────────
    passwordResetToken:   String,
    passwordResetExpires: Date,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ── Hash password before save ─────────────────────────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.pre("validate", function (next) {
  if (this.experienceLevel) {
    this.experienceLevel = normalizeExperienceLevel(this.experienceLevel);
  }

  next();
});

// ── Compare password ──────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ── Calculate profile score ───────────────────────────────────────
userSchema.methods.calculateProfileScore = function () {
  let score = 0;
  if (this.name)                   score += 10;
  if (this.email)                  score += 10;
  if (this.avatar)                 score += 10;
  if (this.bio)                    score += 10;
  if (this.phone)                  score += 5;
  if (this.location)               score += 5;
  if (this.education?.length > 0)  score += 10;
  if (this.skills?.length >= 3)    score += 15;
  if (this.careerGoal)             score += 10;
  if (this.field)                  score += 5;
  if (this.linkedinUrl || this.githubUsername || this.portfolioUrl) score += 10;
  this.profileCompletionScore = score;
  this.isProfileComplete      = score >= 70;
  return score;
};

userSchema.index({ role: 1 });
userSchema.index({ field: 1 });

const User = mongoose.model("User", userSchema);
export default User;
