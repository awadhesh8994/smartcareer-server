import express from "express";
import passport from "passport";
import { protect, generateToken } from "../middleware/auth.middleware.js";
import {
  register, login, getMe, forgotPassword, resetPassword,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// ── Google OAuth ─────────────────────────────────────────────────
router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth`, session: false }),
  (req, res) => {
    const token = generateToken(req.user._id);
    res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${token}`);
  }
);

export default router;
