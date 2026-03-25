// ── dotenv MUST be first ──────────────────────────────────────────
import dotenv from "dotenv";
dotenv.config({ quiet: true });

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { connectDB } from "./config/db.js";
import "./config/passport.js";

// ── Phase 1 Routes ────────────────────────────────────────────────
import authRoutes         from "./routes/auth.routes.js";
import userRoutes         from "./routes/user.routes.js";
import assessmentRoutes   from "./routes/assessment.routes.js";
import roadmapRoutes      from "./routes/roadmap.routes.js";
import learningRoutes     from "./routes/learning.routes.js";
import resumeRoutes       from "./routes/resume.routes.js";
import chatRoutes         from "./routes/chat.routes.js";
import networkRoutes      from "./routes/network.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import adminRoutes        from "./routes/admin.routes.js";

// ── Phase 2 Routes ────────────────────────────────────────────────
import { jobsRouter }  from "./routes/jobs.routes.js";
import recruiterRoutes from "./routes/recruiter.routes.js";
import interviewRoutes from "./routes/interview.routes.js";
import resourceRoutes from "./routes/resource.routes.js";


const app = express();
connectDB();

// ── Rate Limiter ──────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: "Too many requests." },
});

// ── Middleware ────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS — allow all origins (JWT auth, no cookies needed)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));
app.use(limiter);
app.use(passport.initialize());

// ── Health ────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ success: true, message: "CareerAI API is running 🚀" });
});
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Smart Career Platform API 🚀", timestamp: new Date().toISOString() });
});

// ── Phase 1 Routes ────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/assessments",   assessmentRoutes);
app.use("/api/roadmaps",      roadmapRoutes);
app.use("/api/learning",      learningRoutes);
app.use("/api/resumes",       resumeRoutes);
app.use("/api/chat",          chatRoutes);
app.use("/api/network",       networkRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin",         adminRoutes);

// ── Phase 2 Routes ────────────────────────────────────────────────
app.use("/api/jobs",       jobsRouter);
app.use("/api/recruiter",  recruiterRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/resources", resourceRoutes);

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Error Handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌", err.message);
  if (err.name === "ValidationError")
    return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join(". ") });
  if (err.code === 11000)
    return res.status(409).json({ success: false, message: `${Object.keys(err.keyValue)[0]} already exists.` });
  if (err.name === "JsonWebTokenError")
    return res.status(401).json({ success: false, message: "Invalid token." });
  if (err.name === "TokenExpiredError")
    return res.status(401).json({ success: false, message: "Token expired." });
  res.status(err.statusCode || 500).json({ success: false, message: err.message || "Internal Server Error" });
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server: http://localhost:${PORT}`);
  console.log(`📦 Env: ${process.env.NODE_ENV || "development"}\n`);
});

export default app;