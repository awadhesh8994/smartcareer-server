import { MentorNetwork, Forum, Notification } from "../models/index.models.js";
import User from "../models/User.model.js";

// ── GET /api/network/mentors ──────────────────────────────────────
// Shows users from same field with more experience, NOT the current user
export const getMentors = async (req, res, next) => {
  try {
    const { domain } = req.query;
    const currentUser = req.user;

    const EXP_ORDER = [
      "Student (Fresher)", "0-1 years", "1-3 years",
      "3-5 years", "5-8 years", "8+ years",
    ];
    const currentExpIdx = EXP_ORDER.indexOf(currentUser.experienceLevel || "Student (Fresher)");

    const query = {
      _id:      { $ne: currentUser._id },   // not the current user
      role:     "student",
      onboarded: true,
    };

    // Same field as current user (if they have one)
    if (currentUser.field) {
      query.field = currentUser.field;
    }

    // Only show users with MORE experience (actual mentors)
    if (currentExpIdx >= 0 && currentExpIdx < EXP_ORDER.length - 1) {
      const higherLevels = EXP_ORDER.slice(currentExpIdx + 1);
      query.experienceLevel = { $in: higherLevels };
    }

    // Filter by domain/skill if specified
    if (domain) query["skills.name"] = domain;

    const mentors = await User.find(query)
      .select("name avatar skills bio location careerGoal targetRole experienceLevel field")
      .sort({ profileCompletionScore: -1 })
      .limit(20);

    // If no mentors found in same field, broaden to any field
    if (!mentors.length && currentUser.field) {
      delete query.field;
      const broadMentors = await User.find(query)
        .select("name avatar skills bio location careerGoal targetRole experienceLevel field")
        .sort({ profileCompletionScore: -1 })
        .limit(20);
      return res.json({ success: true, data: broadMentors, note: "Showing mentors from all fields" });
    }

    res.json({ success: true, data: mentors });
  } catch (e) { next(e); }
};

// ── POST /api/network/mentor-request ─────────────────────────────
export const sendMentorRequest = async (req, res, next) => {
  try {
    const { mentorId, domain, message } = req.body;
    if (!mentorId) return res.status(400).json({ success: false, message: "mentorId is required." });

    const existing = await MentorNetwork.findOne({
      mentorId,
      studentId: req.user._id,
      status: { $in: ["pending", "active"] },
    });
    if (existing)
      return res.status(409).json({ success: false, message: "Request already sent." });

    const request = await MentorNetwork.create({
      mentorId,
      studentId: req.user._id,
      domain:    domain || "General",
      message:   message || "",
    });

    await Notification.create({
      userId:  mentorId,
      type:    "mentor_request",
      title:   "New Mentorship Request",
      message: `${req.user.name} wants mentorship${domain ? ` in ${domain}` : ""}.`,
      link:    "/network",
    });

    res.status(201).json({ success: true, data: request });
  } catch (e) { next(e); }
};

// ── PATCH /api/network/mentor-request/:id ────────────────────────
export const respondToRequest = async (req, res, next) => {
  try {
    const { status, responseMessage } = req.body;
    const request = await MentorNetwork.findOneAndUpdate(
      { _id: req.params.id, mentorId: req.user._id },
      { status, responseMessage },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: "Request not found." });

    await Notification.create({
      userId:  request.studentId,
      type:    status === "active" ? "mentor_accepted" : "mentor_rejected",
      title:   status === "active" ? "Mentorship Accepted! 🎉" : "Mentorship Request Update",
      message: status === "active" ? "Your mentorship request was accepted!" : "Your mentorship request was declined.",
      link:    "/network",
    });

    res.json({ success: true, data: request });
  } catch (e) { next(e); }
};

// ── GET /api/network/my-mentors ───────────────────────────────────
export const getMyMentors = async (req, res, next) => {
  try {
    const connections = await MentorNetwork.find({ studentId: req.user._id, status: "active" })
      .populate("mentorId", "name avatar bio skills location field");
    res.json({ success: true, data: connections });
  } catch (e) { next(e); }
};

// ── GET /api/network/my-students ─────────────────────────────────
export const getMyStudents = async (req, res, next) => {
  try {
    const connections = await MentorNetwork.find({ mentorId: req.user._id, status: "active" })
      .populate("studentId", "name avatar bio skills careerGoal field");
    res.json({ success: true, data: connections });
  } catch (e) { next(e); }
};

// ── GET /api/network/forum ────────────────────────────────────────
export const getForumPosts = async (req, res, next) => {
  try {
    const { domain, page = 1, limit = 10, search } = req.query;
    const query = {};
    if (domain) query.domain = domain;
    if (search) query.$or = [
      { title: { $regex: search, $options: "i" } },
      { body:  { $regex: search, $options: "i" } },
    ];
    const posts = await Forum.find(query)
      .populate("authorId", "name avatar field")
      .populate("replies.userId", "name avatar")
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    const total = await Forum.countDocuments(query);
    res.json({ success: true, data: posts, total, pages: Math.ceil(total / Number(limit)) });
  } catch (e) { next(e); }
};

// ── POST /api/network/forum ───────────────────────────────────────
export const createForumPost = async (req, res, next) => {
  try {
    const { title, body, domain, tags } = req.body;
    if (!title || !body)
      return res.status(400).json({ success: false, message: "Title and body are required." });
    const post = await Forum.create({
      authorId: req.user._id, title, body,
      domain: domain || req.user.field || "General",
      tags,
    });
    await post.populate("authorId", "name avatar field");
    res.status(201).json({ success: true, data: post });
  } catch (e) { next(e); }
};

// ── POST /api/network/forum/:id/reply ────────────────────────────
export const replyToPost = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: "Content is required." });

    const post = await Forum.findByIdAndUpdate(
      req.params.id,
      { $push: { replies: { userId: req.user._id, content } } },
      { new: true }
    ).populate("authorId", "name avatar field").populate("replies.userId", "name avatar");

    if (!post) return res.status(404).json({ success: false, message: "Post not found." });

    if (post.authorId._id.toString() !== req.user._id.toString()) {
      await Notification.create({
        userId:  post.authorId._id,
        type:    "forum_reply",
        title:   "New reply on your post",
        message: `${req.user.name} replied to "${post.title}"`,
        link:    "/network",
      });
    }

    res.json({ success: true, data: post });
  } catch (e) { next(e); }
};

// ── POST /api/network/forum/:id/like ─────────────────────────────
export const likePost = async (req, res, next) => {
  try {
    const post = await Forum.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });

    const alreadyLiked = post.likedBy?.map(id => id.toString()).includes(req.user._id.toString());
    if (alreadyLiked) {
      post.likedBy.pull(req.user._id);
      post.likes = Math.max(0, post.likes - 1);
    } else {
      post.likedBy.push(req.user._id);
      post.likes += 1;
    }
    await post.save();
    res.json({ success: true, data: { likes: post.likes, liked: !alreadyLiked } });
  } catch (e) { next(e); }
};

// ── GET /api/network/leaderboard ─────────────────────────────────
// Shows leaderboard within same field
export const getLeaderboard = async (req, res, next) => {
  try {
    const query = { role: "student", onboarded: true };
    // Same field leaderboard if user has a field
    if (req.user.field) query.field = req.user.field;

    const users = await User.find(query)
      .select("name avatar skills profileCompletionScore streak field experienceLevel")
      .sort({ profileCompletionScore: -1, "streak.longest": -1 })
      .limit(20);

    res.json({ success: true, data: users });
  } catch (e) { next(e); }
};