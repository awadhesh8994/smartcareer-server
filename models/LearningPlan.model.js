import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema({
  title: String,
  url: { type: String, required: true },
  description: String,
  platform: String,
  tags: [String],
  savedAt: { type: Date, default: Date.now },
});

const playlistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  items: [
    {
      title: String,
      url: String,
      platform: String,
      completed: { type: Boolean, default: false },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const topicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  domain: String,
  resources: [
    {
      title: String,
      url: String,
      type: String,
      isFree: Boolean,
    },
  ],
  targetDate: Date,
  completed: { type: Boolean, default: false },
  progressPercent: { type: Number, default: 0, min: 0, max: 100 },
  notes: String,
});

const learningPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    // ── Study Plans (AI Generated) ───────────────────
    studyPlans: [
      {
        planTitle: String,                  // "Learn React in 30 days"
        generatedFor: String,               // topic
        daysAvailable: Number,
        dailyGoals: [
          {
            day: Number,
            tasks: [String],
            resources: [{ title: String, url: String }],
            completed: { type: Boolean, default: false },
          },
        ],
        createdAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
      },
    ],

    // ── Topic Tracker ────────────────────────────────
    topics: [topicSchema],

    // ── Bookmarks ────────────────────────────────────
    bookmarks: [bookmarkSchema],

    // ── Playlists ────────────────────────────────────
    playlists: [playlistSchema],

    // ── Streak ───────────────────────────────────────
    streakDates: [{ type: String }],        // "YYYY-MM-DD" format
    totalLearningDays: { type: Number, default: 0 },
    lastStudiedAt: Date,
  },
  { timestamps: true }
);


const LearningPlan = mongoose.model("LearningPlan", learningPlanSchema);
export default LearningPlan;
