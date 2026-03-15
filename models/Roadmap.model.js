import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema({
  title: String,
  url: String,
  type: { type: String, enum: ["video", "article", "course", "documentation", "practice"] },
  platform: String, // "YouTube", "Coursera", "freeCodeCamp", etc.
  isFree: { type: Boolean, default: true },
  estimatedMinutes: Number,
});

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  order: { type: Number, required: true },
  resources: [resourceSchema],
  estimatedDays: { type: Number, default: 7 },
  completed: { type: Boolean, default: false },
  completedAt: Date,
  notes: String,                    // user can add personal notes
});

const roadmapSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetRole: { type: String, required: true },
    currentSkills: [String],

    // ── AI Generated Content ────────────────────────
    milestones: [milestoneSchema],
    alternativePaths: [
      {
        role: String,
        matchScore: Number,
        reason: String,
      },
    ],
    summary: String,                 // Claude's overview of the roadmap

    // ── Progress ─────────────────────────────────────
    overallProgress: { type: Number, default: 0, min: 0, max: 100 },
    estimatedCompletionDate: Date,

    // ── Meta ──────────────────────────────────────────
    generatedBy: { type: String, default: "claude-api" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Auto-calculate progress
roadmapSchema.methods.updateProgress = function () {
  if (!this.milestones.length) return;
  const done = this.milestones.filter((m) => m.completed).length;
  this.overallProgress = Math.round((done / this.milestones.length) * 100);
};

roadmapSchema.index({ userId: 1, isActive: 1 });

const Roadmap = mongoose.model("Roadmap", roadmapSchema);
export default Roadmap;
