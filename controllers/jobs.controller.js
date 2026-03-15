import { Job, Application } from "../models/phase2.models.js";
import { Notification }     from "../models/index.models.js";
import { getJobFitScore }   from "../services/claude.service.js";

// ── GET /api/jobs ─────────────────────────────────────────────────
export const getJobs = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 12, search, type,
      location, isRemote, experienceLevel, source,
    } = req.query;

    const query = { isActive: true };
    if (type)            query.type = type;
    if (location)        query.location = { $regex: location, $options: "i" };
    if (isRemote)        query.isRemote = isRemote === "true";
    if (experienceLevel) query.experienceLevel = experienceLevel;
    if (source)          query.source = source;
    if (search)          query.$text = { $search: search };

    const jobs = await Job.find(query)
      .sort({ postedAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate("recruiterId", "name avatar");

    const total = await Job.countDocuments(query);

    res.json({ success: true, data: jobs, total, pages: Math.ceil(total / Number(limit)) });
  } catch (error) { next(error); }
};

// ── GET /api/jobs/:id ─────────────────────────────────────────────
export const getJobById = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate("recruiterId", "name avatar");
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });
    res.json({ success: true, data: job });
  } catch (error) { next(error); }
};

// ── GET /api/jobs/match — AI fit scores for top jobs ──────────────
export const getMatchedJobs = async (req, res, next) => {
  try {
    const userSkills = req.user.skills?.map(s => s.name) || [];
    const targetRole = req.user.targetRole || "";

    if (!userSkills.length && !targetRole) {
      return res.json({ success: true, data: [], message: "Complete your profile to get matched jobs." });
    }

    // Get recent active jobs
    const jobs = await Job.find({ isActive: true }).sort({ postedAt: -1 }).limit(20);

    // Score each job with AI (or simple keyword matching as fallback)
    const scored = await Promise.all(
      jobs.map(async (job) => {
        let fitScore = 0;
        let fitReasons = [];
        try {
          const result = await getJobFitScore({
            userSkills,
            targetRole,
            experienceLevel: req.user.experienceLevel || "Fresher",
            jobTitle:        job.title,
            jobSkills:       job.skillsRequired || [],
            jobDescription:  job.description || "",
          });
          fitScore   = result.score;
          fitReasons = result.reasons || [];
        } catch {
          // Fallback: keyword matching
          const jobText = `${job.title} ${job.skillsRequired.join(" ")}`.toLowerCase();
          const matches = userSkills.filter(s => jobText.includes(s.toLowerCase()));
          fitScore   = Math.min(100, Math.round((matches.length / Math.max(job.skillsRequired.length, 1)) * 100));
          fitReasons = matches.length ? [`Matching skills: ${matches.join(", ")}`] : ["Expand your skills to match this role"];
        }
        return { ...job.toObject(), fitScore, fitReasons };
      })
    );

    // Sort by fit score
    scored.sort((a, b) => b.fitScore - a.fitScore);

    res.json({ success: true, data: scored.slice(0, 10) });
  } catch (error) { next(error); }
};

// ── POST /api/jobs/:id/apply ──────────────────────────────────────
export const applyToJob = async (req, res, next) => {
  try {
    const { fitScore, fitReasons, notes } = req.body;

    const existing = await Application.findOne({ userId: req.user._id, jobId: req.params.id });
    if (existing) {
      // Update status if re-applying
      existing.status   = "applied";
      existing.appliedAt = new Date();
      if (notes) existing.notes = notes;
      await existing.save();
      return res.json({ success: true, data: existing });
    }

    const application = await Application.create({
      userId:    req.user._id,
      jobId:     req.params.id,
      status:    "applied",
      fitScore:  fitScore || 0,
      fitReasons: fitReasons || [],
      notes,
      appliedAt: new Date(),
    });

    res.status(201).json({ success: true, data: application });
  } catch (error) { next(error); }
};

// ── POST /api/jobs/:id/save ───────────────────────────────────────
export const saveJob = async (req, res, next) => {
  try {
    const existing = await Application.findOne({ userId: req.user._id, jobId: req.params.id });
    if (existing) return res.json({ success: true, data: existing, message: "Already saved." });

    const application = await Application.create({
      userId: req.user._id,
      jobId:  req.params.id,
      status: "saved",
    });
    res.status(201).json({ success: true, data: application });
  } catch (error) { next(error); }
};

// ── GET /api/jobs/applications ────────────────────────────────────
export const getApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ userId: req.user._id })
      .populate("jobId")
      .sort({ updatedAt: -1 });
    res.json({ success: true, data: applications });
  } catch (error) { next(error); }
};

// ── PATCH /api/jobs/applications/:id ─────────────────────────────
export const updateApplication = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status, notes },
      { new: true }
    ).populate("jobId");
    if (!application) return res.status(404).json({ success: false, message: "Application not found." });
    res.json({ success: true, data: application });
  } catch (error) { next(error); }
};

// ── DELETE /api/jobs/applications/:id ────────────────────────────
export const deleteApplication = async (req, res, next) => {
  try {
    await Application.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: "Removed." });
  } catch (error) { next(error); }
};
