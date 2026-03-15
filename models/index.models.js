import mongoose from "mongoose";

// ── ChatHistory ───────────────────────────────────────────────────
const chatHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    totalMessages: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ── MentorNetwork ─────────────────────────────────────────────────
const mentorNetworkSchema = new mongoose.Schema(
  {
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "active", "rejected", "closed"], default: "pending" },
    domain: { type: String, required: true },
    message: { type: String, maxlength: 500 },
    responseMessage: String,
    scheduledSessions: [
      {
        date: Date,
        duration: Number,
        topic: String,
        notes: String,
        completed: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

// ── Forum ─────────────────────────────────────────────────────────
const forumSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 5000 },
    domain: {
      type: String,
      enum: ["DSA", "Web Development", "Machine Learning", "Cloud Computing",
             "Career Advice", "Resume", "Interview", "General"],
    },
    tags: [String],
    replies: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        content: { type: String, maxlength: 2000 },
        likes: { type: Number, default: 0 },
        likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        createdAt: { type: Date, default: Date.now },
      },
    ],
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    views: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    isClosed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Notification ──────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "assessment_reminder", "roadmap_update", "mentor_request",
        "mentor_accepted", "mentor_rejected", "forum_reply",
        "forum_like", "streak_reminder", "weekly_digest",
        "profile_incomplete", "system",
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    link: String,                   // frontend route to navigate to
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// ── AdminLog ──────────────────────────────────────────────────────
const adminLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    targetType: { type: String, enum: ["user", "forum", "assessment", "roadmap", "system"] },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    details: String,
    ip: String,
  },
  { timestamps: true }
);

// Indexes
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });
forumSchema.index({ domain: 1, createdAt: -1 });
forumSchema.index({ tags: 1 });
mentorNetworkSchema.index({ mentorId: 1, status: 1 });
mentorNetworkSchema.index({ studentId: 1, status: 1 });

export const ChatHistory = mongoose.model("ChatHistory", chatHistorySchema);
export const MentorNetwork = mongoose.model("MentorNetwork", mentorNetworkSchema);
export const Forum = mongoose.model("Forum", forumSchema);
export const Notification = mongoose.model("Notification", notificationSchema);
export const AdminLog = mongoose.model("AdminLog", adminLogSchema);
