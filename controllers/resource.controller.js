import Resource from "../models/Resource.model.js";

// ── GET /api/resources ────────────────────────────────────────────
export const getResources = async (req, res, next) => {
  try {
    const { field, category, difficulty, isFree, search, sort = "top", page = 1, limit = 20 } = req.query;

    const query = { status: "approved" };
    if (field)      query.field      = field;
    if (category)   query.category   = category;
    if (difficulty) query.difficulty = difficulty;
    if (isFree !== undefined) query.isFree = isFree === "true";
    if (search) {
      query.$or = [
        { title:       { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags:        { $regex: search, $options: "i" } },
      ];
    }

    const sortMap = {
      top:    { isPinned: -1, upvotes: -1 },
      newest: { isPinned: -1, createdAt: -1 },
      free:   { isPinned: -1, isFree: -1, upvotes: -1 },
    };

    const resources = await Resource.find(query)
      .populate("submittedBy", "name avatar field")
      .sort(sortMap[sort] || sortMap.top)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Resource.countDocuments(query);

    // Add isUpvoted and isCompleted flags for current user
    const userId = req.user._id.toString();
    const enriched = resources.map(r => ({
      ...r.toObject(),
      isUpvoted:   r.upvotedBy.some(id => id.toString() === userId),
      isCompleted: r.completedBy.some(id => id.toString() === userId),
    }));

    res.json({ success: true, data: enriched, total, pages: Math.ceil(total / Number(limit)) });
  } catch (e) { next(e); }
};

// ── POST /api/resources — submit for review ───────────────────────
export const submitResource = async (req, res, next) => {
  try {
    const { title, url, description, field, category, difficulty, isFree, cost, tags } = req.body;

    if (!title || !url || !description || !field || !category)
      return res.status(400).json({ success: false, message: "Title, URL, description, field and category are required." });

    // Check duplicate URL
    const existing = await Resource.findOne({ url, status: { $ne: "rejected" } });
    if (existing)
      return res.status(409).json({ success: false, message: "This resource has already been submitted." });

    const resource = await Resource.create({
      title, url, description, field, category,
      difficulty: difficulty || "Beginner",
      isFree:     isFree !== false,
      cost:       isFree ? "" : (cost || ""),
      tags:       Array.isArray(tags) ? tags : (tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : []),
      submittedBy: req.user._id,
      status:     "pending",
    });

    res.status(201).json({
      success: true,
      data:    resource,
      message: "Resource submitted! It will appear after admin review.",
    });
  } catch (e) { next(e); }
};

// ── POST /api/resources/:id/upvote ────────────────────────────────
export const upvoteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findOne({ _id: req.params.id, status: "approved" });
    if (!resource) return res.status(404).json({ success: false, message: "Resource not found." });

    const userId    = req.user._id;
    const hasVoted  = resource.upvotedBy.some(id => id.toString() === userId.toString());

    if (hasVoted) {
      resource.upvotedBy.pull(userId);
      resource.upvotes = Math.max(0, resource.upvotes - 1);
    } else {
      resource.upvotedBy.push(userId);
      resource.upvotes += 1;
    }

    await resource.save();
    res.json({ success: true, data: { upvotes: resource.upvotes, isUpvoted: !hasVoted } });
  } catch (e) { next(e); }
};

// ── POST /api/resources/:id/complete ─────────────────────────────
export const markCompleted = async (req, res, next) => {
  try {
    const resource = await Resource.findOne({ _id: req.params.id, status: "approved" });
    if (!resource) return res.status(404).json({ success: false, message: "Resource not found." });

    const userId       = req.user._id;
    const hasCompleted = resource.completedBy.some(id => id.toString() === userId.toString());

    if (hasCompleted) {
      resource.completedBy.pull(userId);
    } else {
      resource.completedBy.push(userId);
    }

    await resource.save();
    res.json({ success: true, data: { isCompleted: !hasCompleted, completedCount: resource.completedBy.length } });
  } catch (e) { next(e); }
};

// ── GET /api/resources/pending — admin ───────────────────────────
export const getPendingResources = async (req, res, next) => {
  try {
    const resources = await Resource.find({ status: "pending" })
      .populate("submittedBy", "name email avatar")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: resources, count: resources.length });
  } catch (e) { next(e); }
};

// ── PATCH /api/resources/:id/approve — admin ─────────────────────
export const approveResource = async (req, res, next) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { status: "approved", verifiedAt: new Date() },
      { new: true }
    );
    if (!resource) return res.status(404).json({ success: false, message: "Resource not found." });
    res.json({ success: true, data: resource, message: "Resource approved." });
  } catch (e) { next(e); }
};

// ── PATCH /api/resources/:id/reject — admin ──────────────────────
export const rejectResource = async (req, res, next) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    if (!resource) return res.status(404).json({ success: false, message: "Resource not found." });
    res.json({ success: true, message: "Resource rejected." });
  } catch (e) { next(e); }
};

// ── PATCH /api/resources/:id/pin — admin ─────────────────────────
export const pinResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, message: "Resource not found." });
    resource.isPinned = !resource.isPinned;
    await resource.save();
    res.json({ success: true, data: { isPinned: resource.isPinned } });
  } catch (e) { next(e); }
};

// ── DELETE /api/resources/:id — admin ────────────────────────────
export const deleteResource = async (req, res, next) => {
  try {
    await Resource.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Resource deleted." });
  } catch (e) { next(e); }
};