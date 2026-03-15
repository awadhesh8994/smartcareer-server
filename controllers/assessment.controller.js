import Assessment from "../models/Assessment.model.js";
import User from "../models/User.model.js";
import { analyzeSkillGap, generateAssessmentQuestions } from "../services/claude.service.js";
import { getQuestionsByDomain, getAllDomains } from "../services/questionBank.service.js";

// Field → available domains mapping
const FIELD_DOMAINS = {
  "Technology":              ["DSA", "Web Development", "Machine Learning", "Cloud Computing", "Python", "Cybersecurity"],
  "Business & Management":   ["Product Management", "Project Management", "Data Analysis", "Digital Marketing"],
  "Finance & Accounting":    ["Finance", "Data Analysis", "Financial Modelling", "Business Analysis"],
  "Law & Legal":             ["Contract Law", "Constitutional Law", "Corporate Law", "Legal Research", "Intellectual Property"],
  "Arts & Design":           ["UI/UX Design", "Graphic Design", "Motion Design", "Photography", "Brand Design"],
  "Marketing & Media":       ["Digital Marketing", "Content Strategy", "SEO & Analytics", "Social Media Marketing", "Brand Management"],
  "Healthcare & Medicine":   ["Medical Terminology", "Healthcare Management", "Clinical Research", "Pharmacology", "Public Health"],
  "Engineering (Non-CS)":    ["Engineering Fundamentals", "Quality Management", "CAD & Design", "Project Management", "Manufacturing"],
  "Education":               ["Curriculum Design", "Teaching Pedagogy", "Educational Psychology", "Assessment Design", "EdTech"],
  "Science & Research":      ["Research Methods", "Statistical Analysis", "Academic Writing", "Lab Skills", "Data Interpretation"],
  "Other":                   ["Critical Thinking", "Communication Skills", "Problem Solving", "Leadership", "Data Analysis"],
};

// Static question bank domains (ones we have pre-written questions for)
const STATIC_DOMAINS = new Set(getAllDomains());

// ── GET /api/assessments/domains ──────────────────────────────────
export const getDomainsForUser = async (req, res, next) => {
  try {
    const userField  = req.user.field || "Technology";
    const domains    = FIELD_DOMAINS[userField] || FIELD_DOMAINS["Technology"];
    const allDomains = Object.values(FIELD_DOMAINS).flat();

    res.json({
      success: true,
      data: {
        recommended: domains,        // domains for user's field
        all:         allDomains,     // all domains (for "explore more")
        userField,
      },
    });
  } catch (e) { next(e); }
};

// ── POST /api/assessments/start ───────────────────────────────────
export const startAssessment = async (req, res, next) => {
  try {
    const { domain } = req.body;
    if (!domain)
      return res.status(400).json({ success: false, message: "Domain is required." });

    // Resume in-progress
    const existing = await Assessment.findOne({ userId: req.user._id, domain, status: "in-progress" });
    if (existing) {
      const safeQ = existing.questions.map(q => ({
        _id: q._id, question: q.question, options: q.options,
        difficulty: q.difficulty, topic: q.topic,
      }));
      return res.json({ success: true, data: { _id: existing._id, domain, questions: safeQ } });
    }

    let questions;
    const isStatic = STATIC_DOMAINS.has(domain);

    if (isStatic) {
      // Use pre-written question bank
      questions = getQuestionsByDomain(domain, 15);
    } else {
      // Generate dynamically with AI
      try {
        const userField = req.user.field || "Technology";
        const aiQuestions = await generateAssessmentQuestions({ domain, field: userField, count: 15 });
        // Validate and clean AI questions
        questions = aiQuestions.filter(q =>
          q.question && Array.isArray(q.options) &&
          q.options.length === 4 && typeof q.correctAnswer === "number"
        );
        if (!questions.length) throw new Error("No valid questions generated");
      } catch (aiErr) {
        console.warn("⚠️  AI question generation failed, using fallback:", aiErr.message);
        // Fallback: use generic critical thinking questions
        questions = getQuestionsByDomain("DSA", 15);
      }
    }

    const assessment = await Assessment.create({
      userId: req.user._id,
      domain,
      questions,
      totalQuestions: questions.length,
      status: "in-progress",
      generatedBy: isStatic ? "static" : "ai",
    });

    const safeQ = assessment.questions.map(q => ({
      _id: q._id, question: q.question, options: q.options,
      difficulty: q.difficulty, topic: q.topic,
    }));

    res.status(201).json({ success: true, data: { _id: assessment._id, domain, questions: safeQ, generatedBy: assessment.generatedBy } });
  } catch (e) { next(e); }
};

// ── POST /api/assessments/submit/:id ─────────────────────────────
export const submitAssessment = async (req, res, next) => {
  try {
    const { answers = [], timeTakenMinutes = 0 } = req.body;

    const assessment = await Assessment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!assessment)
      return res.status(404).json({ success: false, message: "Assessment not found." });
    if (assessment.status === "completed")
      return res.status(400).json({ success: false, message: "Assessment already submitted." });

    let correctCount = 0;
    const gradedAnswers = [];
    const weakTopics    = [];
    const strongTopics  = [];

    assessment.questions.forEach(q => {
      const userAnswer = answers.find(a => a.questionId === q._id.toString());
      const chosen     = userAnswer?.chosen ?? -1;
      const isCorrect  = chosen === q.correctAnswer;
      if (isCorrect) {
        correctCount++;
        if (q.topic && !strongTopics.includes(q.topic)) strongTopics.push(q.topic);
      } else {
        if (q.topic && !weakTopics.includes(q.topic)) weakTopics.push(q.topic);
      }
      gradedAnswers.push({ questionId: q._id, questionText: q.question, chosen, isCorrect });
    });

    const score      = Math.round((correctCount / assessment.totalQuestions) * 100);
    const skillLevel = score >= 75 ? "Advanced" : score >= 45 ? "Intermediate" : "Beginner";

    let aiAnalysis = { recommendations: [], summary: "" };
    try {
      aiAnalysis = await analyzeSkillGap({
        domain: assessment.domain, score, skillLevel, weakTopics, strongTopics,
      });
    } catch {
      aiAnalysis = {
        summary: `You scored ${score}% (${skillLevel}) on ${assessment.domain}.`,
        recommendations: weakTopics.length
          ? [`Focus on improving: ${weakTopics.join(", ")}`]
          : ["Excellent! Keep practising to maintain your skills."],
      };
    }

    assessment.answers         = gradedAnswers;
    assessment.correctAnswers  = correctCount;
    assessment.score           = score;
    assessment.skillLevel      = skillLevel;
    assessment.timeTakenMinutes = timeTakenMinutes;
    assessment.skillGaps       = weakTopics;
    assessment.strongTopics    = strongTopics;
    assessment.recommendations = aiAnalysis.recommendations || [];
    assessment.status          = "completed";
    assessment.completedAt     = new Date();
    await assessment.save();

    // Update user skills
    try {
      const existingSkill = req.user.skills?.find(s => s.name === assessment.domain);
      if (!existingSkill) {
        await User.findByIdAndUpdate(req.user._id, {
          $push: { skills: { name: assessment.domain, level: skillLevel, verified: true } },
        });
      }
    } catch {}

    res.json({
      success: true,
      data: {
        score, skillLevel, correctAnswers: correctCount,
        totalQuestions: assessment.totalQuestions,
        weakTopics, strongTopics,
        recommendations: aiAnalysis.recommendations,
        analysis: aiAnalysis.summary,
      },
    });
  } catch (e) { next(e); }
};

// ── GET /api/assessments/history ──────────────────────────────────
export const getAssessmentHistory = async (req, res, next) => {
  try {
    const assessments = await Assessment.find({ userId: req.user._id, status: "completed" })
      .select("-questions -answers")
      .sort({ completedAt: -1 });
    res.json({ success: true, count: assessments.length, data: assessments });
  } catch (e) { next(e); }
};

// ── GET /api/assessments/:id ──────────────────────────────────────
export const getAssessmentById = async (req, res, next) => {
  try {
    const assessment = await Assessment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!assessment)
      return res.status(404).json({ success: false, message: "Assessment not found." });
    res.json({ success: true, data: assessment });
  } catch (e) { next(e); }
};