import { ChatHistory } from "../models/index.models.js";
import { chatWithCareerAdvisor } from "../services/claude.service.js";

// ── POST /api/chat/message ────────────────────────────────────────
export const sendMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim())
      return res.status(400).json({ success: false, message: "Message cannot be empty." });

    let chat = await ChatHistory.findOne({ userId: req.user._id });
    if (!chat) chat = new ChatHistory({ userId: req.user._id, messages: [] });

    chat.messages.push({ role: "user", content: message });

    const history = chat.messages.slice(-20).map(m => ({ role: m.role, content: m.content }));

    let reply;
    try {
      reply = await chatWithCareerAdvisor({
        history,
        userProfile: {
          name:            req.user.name,
          field:           req.user.field           || "Not specified",
          userType:        req.user.userType         || "Student",
          goal:            req.user.goal             || "Not specified",
          skills:          req.user.skills           || [],
          careerGoal:      req.user.careerGoal       || "",
          targetRole:      req.user.targetRole       || "",
          experienceLevel: req.user.experienceLevel  || "Student (Fresher)",
          currentTitle:    req.user.currentTitle     || "",
          currentCompany:  req.user.currentCompany   || "",
        },
      });
    } catch (aiErr) {
      console.warn("⚠️  Groq API error:", aiErr.message);
      reply = "Our AI advisor is temporarily unavailable. Please try again in a moment! 🚀";
    }

    chat.messages.push({ role: "assistant", content: reply });
    chat.totalMessages = chat.messages.length;
    await chat.save();

    res.json({ success: true, data: { reply, totalMessages: chat.totalMessages } });
  } catch (e) { next(e); }
};

// ── GET /api/chat/history ─────────────────────────────────────────
export const getChatHistory = async (req, res, next) => {
  try {
    const chat = await ChatHistory.findOne({ userId: req.user._id });
    res.json({ success: true, data: chat?.messages || [] });
  } catch (e) { next(e); }
};

// ── DELETE /api/chat/history ──────────────────────────────────────
export const clearHistory = async (req, res, next) => {
  try {
    await ChatHistory.findOneAndUpdate(
      { userId: req.user._id },
      { messages: [], totalMessages: 0 },
      { upsert: true }
    );
    res.json({ success: true, message: "Chat history cleared." });
  } catch (e) { next(e); }
};