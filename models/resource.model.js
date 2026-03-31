import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    url:         { type: String, required: true, trim: true },
    description: { type: String, required: true, maxlength: 500 },

    field: {
      type: String,
      required: true,
      enum: [
        "Technology", "Business & Management", "Finance & Accounting",
        "Law & Legal", "Arts & Design", "Marketing & Media",
        "Healthcare & Medicine", "Engineering (Non-CS)",
        "Education", "Science & Research", "Other",
      ],
    },

    category: {
      type: String,
      required: true,
      enum: ["Course", "Book", "YouTube", "Tool", "Article", "Practice"],
    },

    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },

    isFree:  { type: Boolean, default: true },
    cost:    { type: String, default: "" },       // e.g. "$29", "₹499"
    tags:    [{ type: String }],

    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status:      { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    isPinned:    { type: Boolean, default: false },
    verifiedAt:  { type: Date },

    upvotes:     { type: Number, default: 0 },
    upvotedBy:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

resourceSchema.index({ field: 1, status: 1 });
resourceSchema.index({ category: 1, status: 1 });
resourceSchema.index({ status: 1, upvotes: -1 });

const Resource = mongoose.model("Resource", resourceSchema);
export default Resource;