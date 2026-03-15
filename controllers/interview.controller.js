import { Interview } from "../models/phase2.models.js";
import { generateInterviewQuestions, evaluateInterviewAnswer, getInterviewFeedback } from "../services/claude.service.js";

const QUESTION_BANK = {
  "SDE": [
    { question: "Tell me about yourself and your technical background.", category: "HR", difficulty: "easy", expectedKeywords: ["experience", "skills", "projects", "passion"] },
    { question: "What is the difference between a stack and a queue? Give a real-world example of each.", category: "Technical", difficulty: "easy", expectedKeywords: ["LIFO", "FIFO", "stack", "queue", "example"] },
    { question: "Explain the concept of time complexity. What is O(n log n)?", category: "Technical", difficulty: "medium", expectedKeywords: ["Big O", "time", "complexity", "merge sort", "operations"] },
    { question: "How would you design a URL shortener like bit.ly?", category: "System Design", difficulty: "hard", expectedKeywords: ["database", "hashing", "API", "scale", "cache"] },
    { question: "What are SOLID principles? Give an example of one.", category: "Technical", difficulty: "medium", expectedKeywords: ["single responsibility", "open closed", "Liskov", "interface", "dependency"] },
    { question: "Describe a challenging project you worked on and how you overcame obstacles.", category: "HR", difficulty: "medium", expectedKeywords: ["challenge", "solution", "team", "learning", "result"] },
    { question: "What is the difference between REST and GraphQL?", category: "Technical", difficulty: "medium", expectedKeywords: ["REST", "GraphQL", "endpoint", "query", "flexibility"] },
    { question: "How does garbage collection work in Java/Python?", category: "Technical", difficulty: "medium", expectedKeywords: ["memory", "heap", "reference", "GC", "automatic"] },
    { question: "Where do you see yourself in 5 years?", category: "HR", difficulty: "easy", expectedKeywords: ["growth", "leadership", "skills", "contribution", "goal"] },
    { question: "How would you reverse a linked list?", category: "Technical", difficulty: "easy", expectedKeywords: ["pointer", "next", "previous", "iteration", "recursion"] },
  ],
  "Data Analyst": [
    { question: "Tell me about yourself and your experience with data.", category: "HR", difficulty: "easy", expectedKeywords: ["data", "analysis", "tools", "experience", "projects"] },
    { question: "What is the difference between supervised and unsupervised learning?", category: "Technical", difficulty: "medium", expectedKeywords: ["labeled", "unlabeled", "classification", "clustering", "training"] },
    { question: "How do you handle missing data in a dataset?", category: "Technical", difficulty: "easy", expectedKeywords: ["imputation", "drop", "mean", "median", "strategy"] },
    { question: "Explain the difference between a left join and an inner join in SQL.", category: "Technical", difficulty: "easy", expectedKeywords: ["join", "NULL", "matching", "rows", "SQL"] },
    { question: "What is A/B testing and how would you design one?", category: "Technical", difficulty: "medium", expectedKeywords: ["hypothesis", "control", "variant", "statistical", "significance"] },
    { question: "Describe a time you found a critical insight from data.", category: "HR", difficulty: "medium", expectedKeywords: ["insight", "data", "decision", "impact", "business"] },
    { question: "What is the Central Limit Theorem?", category: "Technical", difficulty: "medium", expectedKeywords: ["distribution", "sample", "normal", "mean", "statistics"] },
    { question: "How do you ensure data quality in your analysis?", category: "Technical", difficulty: "medium", expectedKeywords: ["validation", "cleaning", "duplicates", "outliers", "consistency"] },
  ],
  "Product Manager": [
    { question: "Tell me about yourself and why you want to be a PM.", category: "HR", difficulty: "easy", expectedKeywords: ["product", "user", "strategy", "leadership", "impact"] },
    { question: "How would you prioritise features for a new product?", category: "Product", difficulty: "medium", expectedKeywords: ["framework", "user", "business value", "effort", "RICE"] },
    { question: "Design a feature for Instagram to increase user engagement.", category: "Product", difficulty: "hard", expectedKeywords: ["user", "engagement", "metrics", "A/B test", "rollout"] },
    { question: "How do you define success for a product?", category: "Product", difficulty: "medium", expectedKeywords: ["metrics", "KPI", "user", "business", "OKR"] },
    { question: "Tell me about a product you love and how you would improve it.", category: "Product", difficulty: "medium", expectedKeywords: ["user pain", "improvement", "feature", "impact", "data"] },
    { question: "How do you handle disagreements with the engineering team?", category: "HR", difficulty: "medium", expectedKeywords: ["communication", "alignment", "data", "tradeoffs", "collaboration"] },
  ],
  "Full Stack Developer": [
    { question: "Walk me through how a web request works from browser to database.", category: "Technical", difficulty: "medium", expectedKeywords: ["DNS", "HTTP", "server", "database", "response"] },
    { question: "What is the difference between SQL and NoSQL databases?", category: "Technical", difficulty: "easy", expectedKeywords: ["schema", "flexible", "scalability", "ACID", "document"] },
    { question: "Explain React's virtual DOM and why it's useful.", category: "Technical", difficulty: "medium", expectedKeywords: ["virtual DOM", "reconciliation", "performance", "diff", "re-render"] },
    { question: "How would you optimise a slow API endpoint?", category: "Technical", difficulty: "hard", expectedKeywords: ["cache", "index", "query", "profiling", "pagination"] },
    { question: "What is JWT authentication and how does it work?", category: "Technical", difficulty: "medium", expectedKeywords: ["token", "payload", "signature", "stateless", "verify"] },
    { question: "Describe your most complex full-stack project.", category: "HR", difficulty: "medium", expectedKeywords: ["frontend", "backend", "database", "challenge", "solution"] },
    { question: "What is CORS and how do you handle it?", category: "Technical", difficulty: "easy", expectedKeywords: ["cross-origin", "policy", "headers", "preflight", "browser"] },
    { question: "How do you ensure your application is secure?", category: "Technical", difficulty: "medium", expectedKeywords: ["XSS", "CSRF", "SQL injection", "HTTPS", "validation"] },
  ],
};

const getRoleQuestions = (role) => {
  const key = Object.keys(QUESTION_BANK).find(k => role.toLowerCase().includes(k.toLowerCase())) || "SDE";
  return QUESTION_BANK[key];
};

// ── POST /api/interviews/start ────────────────────────────────────
export const startInterview = async (req, res, next) => {
  try {
    const { role, type = "Mixed" } = req.body;
    if (!role) return res.status(400).json({ success: false, message: "Role is required." });

    let questions;
    try {
      questions = await generateInterviewQuestions({ role, type, count: 8 });
    } catch {
      questions = getRoleQuestions(role).slice(0, 8);
    }

    const interview = await Interview.create({
      userId:    req.user._id,
      role,
      type,
      questions,
      status:    "in-progress",
    });

    // Return questions without expected keywords
    const safeQ = interview.questions.map((q, i) => ({
      index: i, question: q.question,
      category: q.category, difficulty: q.difficulty,
    }));

    res.status(201).json({ success: true, data: { _id: interview._id, role, type, questions: safeQ } });
  } catch (error) { next(error); }
};

// ── POST /api/interviews/:id/answer ──────────────────────────────
export const submitAnswer = async (req, res, next) => {
  try {
    const { questionIndex, userAnswer } = req.body;
    if (userAnswer === undefined || questionIndex === undefined)
      return res.status(400).json({ success: false, message: "questionIndex and userAnswer required." });

    const interview = await Interview.findOne({ _id: req.params.id, userId: req.user._id });
    if (!interview) return res.status(404).json({ success: false, message: "Interview not found." });

    const question = interview.questions[questionIndex];
    if (!question) return res.status(400).json({ success: false, message: "Invalid question index." });

    let evaluation = { score: 5, feedback: "Good answer.", keywordsFound: [], starScore: 5 };
    try {
      evaluation = await evaluateInterviewAnswer({
        question:         question.question,
        answer:           userAnswer,
        expectedKeywords: question.expectedKeywords || [],
        role:             interview.role,
      });
    } catch {
      // Simple keyword matching fallback
      const found = (question.expectedKeywords || []).filter(k =>
        userAnswer.toLowerCase().includes(k.toLowerCase())
      );
      const score = Math.min(10, Math.round((found.length / Math.max(question.expectedKeywords?.length || 1, 1)) * 10));
      evaluation = {
        score,
        feedback: found.length ? `Good — you covered: ${found.join(", ")}` : "Try to include more specific technical terms.",
        keywordsFound: found,
        starScore: score,
      };
    }

    // Add or update answer
    const existingIdx = interview.answers.findIndex(a => a.questionIndex === questionIndex);
    const answerData = {
      questionIndex,
      questionText:  question.question,
      userAnswer,
      aiScore:       evaluation.score,
      aiFeedback:    evaluation.feedback,
      starScore:     evaluation.starScore,
      keywordsFound: evaluation.keywordsFound || [],
    };

    if (existingIdx >= 0) interview.answers[existingIdx] = answerData;
    else interview.answers.push(answerData);

    await interview.save();

    res.json({ success: true, data: { evaluation, answersCount: interview.answers.length } });
  } catch (error) { next(error); }
};

// ── POST /api/interviews/:id/complete ────────────────────────────
export const completeInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.user._id });
    if (!interview) return res.status(404).json({ success: false, message: "Interview not found." });
    if (interview.status === "completed")
      return res.json({ success: true, data: interview });

    // Calculate overall score
    const totalScore = interview.answers.reduce((sum, a) => sum + (a.aiScore || 0), 0);
    const overallScore = interview.answers.length
      ? Math.round((totalScore / (interview.answers.length * 10)) * 100)
      : 0;

    let overallFeedback = "";
    let strengths = [];
    let improvements = [];

    try {
      const result = await getInterviewFeedback({
        role:      interview.role,
        answers:   interview.answers,
        score:     overallScore,
      });
      overallFeedback = result.feedback;
      strengths       = result.strengths || [];
      improvements    = result.improvements || [];
    } catch {
      overallFeedback = `You scored ${overallScore}% overall. ${overallScore >= 70 ? "Great performance!" : "Keep practising!"}`;
      strengths       = interview.answers.filter(a => a.aiScore >= 7).map(a => a.questionText?.substring(0, 40) + "...");
      improvements    = interview.answers.filter(a => a.aiScore < 5).map(a => a.questionText?.substring(0, 40) + "...");
    }

    interview.overallScore    = overallScore;
    interview.overallFeedback = overallFeedback;
    interview.strengths       = strengths;
    interview.improvements    = improvements;
    interview.status          = "completed";
    interview.completedAt     = new Date();
    await interview.save();

    res.json({ success: true, data: interview });
  } catch (error) { next(error); }
};

// ── GET /api/interviews/history ───────────────────────────────────
export const getInterviewHistory = async (req, res, next) => {
  try {
    const interviews = await Interview.find({ userId: req.user._id, status: "completed" })
      .select("-questions -answers")
      .sort({ completedAt: -1 });
    res.json({ success: true, data: interviews });
  } catch (error) { next(error); }
};

// ── GET /api/interviews/:id ───────────────────────────────────────
export const getInterviewById = async (req, res, next) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.user._id });
    if (!interview) return res.status(404).json({ success: false, message: "Interview not found." });
    res.json({ success: true, data: interview });
  } catch (error) { next(error); }
};
