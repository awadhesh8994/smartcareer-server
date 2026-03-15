import crypto from "crypto";
import User from "../models/User.model.js";
import { generateToken } from "../middleware/auth.middleware.js";
import { sendEmail } from "../services/email.service.js";

const sendTokenResponse = (user, statusCode, res) => {
  const token   = generateToken(user._id);
  const userObj = user.toObject();
  delete userObj.password;
  res.status(statusCode).json({ success: true, token, data: userObj });
};

// ── POST /api/auth/register ───────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, companyName } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "Name, email and password are required." });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ success: false, message: "Email already registered." });

    // Validate recruiter registration
    if (role === "recruiter" && !companyName)
      return res.status(400).json({ success: false, message: "Company name is required for recruiter registration." });

    const userData = {
      name,
      email,
      password,
      role: role === "recruiter" ? "recruiter" : "student",
    };

    // Recruiter starts as pending — needs admin approval
    if (role === "recruiter") {
      userData.recruiterStatus = "pending";
      userData.companyName     = companyName;
    }

    const user = new User(userData);
    user.calculateProfileScore();
    await user.save();

    // If recruiter — don't send token, send pending message instead
    if (role === "recruiter") {
      return res.status(201).json({
        success: true,
        pending: true,
        message: "Recruiter account created! Your account is pending admin approval. You will be notified once approved.",
      });
    }

    sendTokenResponse(user, 201, res);
  } catch (error) { next(error); }
};

// ── POST /api/auth/login ──────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password are required." });

    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.password)
      return res.status(401).json({ success: false, message: "Invalid credentials." });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Invalid credentials." });

    // Block pending recruiters from logging in
    if (user.role === "recruiter" && user.recruiterStatus === "pending") {
      return res.status(403).json({
        success: false,
        pending: true,
        message: "Your recruiter account is pending admin approval. Please wait for approval before logging in.",
      });
    }

    // Block rejected recruiters
    if (user.role === "recruiter" && user.recruiterStatus === "rejected") {
      return res.status(403).json({
        success: false,
        message: "Your recruiter application was rejected. Please contact support.",
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) { next(error); }
};

// ── GET /api/auth/me ──────────────────────────────────────────────
export const getMe = async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
};

// ── POST /api/auth/forgot-password ───────────────────────────────
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "No account with that email." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken   = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    await sendEmail({
      to:      user.email,
      subject: "Password Reset — Smart Career Platform",
      html:    `<h2>Password Reset</h2><p>Reset link (expires in 10 min):</p><a href="${resetUrl}">${resetUrl}</a>`,
    });

    res.status(200).json({ success: true, message: "Password reset link sent to your email." });
  } catch (error) { next(error); }
};

// ── POST /api/auth/reset-password/:token ─────────────────────────
export const resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!user)
      return res.status(400).json({ success: false, message: "Reset token is invalid or expired." });

    user.password             = req.body.password;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) { next(error); }
};