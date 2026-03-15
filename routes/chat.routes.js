import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { sendMessage, getChatHistory, clearHistory } from "../controllers/chat.controller.js";

const router = express.Router();
router.use(protect);
router.post("/message",   sendMessage);
router.get("/history",    getChatHistory);
router.delete("/history", clearHistory);

export default router;
