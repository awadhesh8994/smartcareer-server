import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true }, // index of correct option
  difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
  topic: { type: String },
  explanation: { type: String },
});

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId },
  questionText: String,
  chosen: { type: Number }, // index chosen
  isCorrect: { type: Boolean },
  timeTaken: { type: Number }, // seconds
});

const assessmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    domain: {
      type: String,
      required: true,
      // No enum restriction — supports all fields (Tech, Law, Finance, Design, etc.)
    },
    questions: [questionSchema],
    answers: [answerSchema],

    // ── Results ─────────────────────────────────────
    totalQuestions: { type: Number },
    generatedBy: { type: String, enum: ["static", "ai"], default: "static" },
    correctAnswers: { type: Number, default: 0 },
    score: { type: Number, default: 0 },        // percentage
    skillLevel: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
    },
    timeTakenMinutes: { type: Number },

    // ── Skill Gap Analysis ───────────────────────────
    skillGaps: [{ type: String }],              // topics to improve
    strongTopics: [{ type: String }],
    recommendations: [{ type: String }],

    // ── Status ──────────────────────────────────────
    status: { type: String, enum: ["in-progress", "completed"], default: "in-progress" },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    nextReminderAt: { type: Date },
  },
  { timestamps: true }
);

assessmentSchema.index({ userId: 1, domain: 1 });
assessmentSchema.index({ userId: 1, createdAt: -1 });

const Assessment = mongoose.model("Assessment", assessmentSchema);
export default Assessment;