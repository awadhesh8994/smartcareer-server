import express from "express";
import passport from "passport";
import { protect, generateToken } from "../middleware/auth.middleware.js";
import { CLIENT_URL } from "../config/runtime.js";
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
  passport.authenticate("google", { failureRedirect: `${CLIENT_URL}/login?error=oauth`, session: false }),
  (req, res) => {
    if (req.user?.role === "recruiter" && req.user?.recruiterStatus === "pending") {
      return res.redirect(
        `${CLIENT_URL}/login?error=pending_recruiter`
      );
    }

    if (req.user?.role === "recruiter" && req.user?.recruiterStatus === "rejected") {
      return res.redirect(
        `${CLIENT_URL}/login?error=rejected_recruiter`
      );
    }

    const token = generateToken(req.user._id);
    res.redirect(`${CLIENT_URL}/oauth-success?token=${token}`);
  }
);

export default router;
