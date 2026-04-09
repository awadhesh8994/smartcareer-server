import nodemailer from "nodemailer";
import { CLIENT_URL } from "../config/runtime.js";

class EmailDeliveryError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "EmailDeliveryError";
    this.cause = cause;
  }
}

const getTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new EmailDeliveryError("Email service is not configured. Set EMAIL_USER and EMAIL_PASS first.");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    await getTransporter().sendMail({
      from: `"Smart Career Platform" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });

    return { success: true };
  } catch (error) {
    console.error("Email send error:", error.message);
    throw new EmailDeliveryError(
      "Email delivery failed. Verify your SMTP credentials and try again.",
      error
    );
  }
};

export const sendWeeklyDigest = async (user, stats) => {
  await sendEmail({
    to: user.email,
    subject: "Your Weekly Career Progress",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#6366f1;">Hi ${user.name}, here's your weekly summary!</h2>
        <div style="background:#f9fafb;padding:20px;border-radius:8px;">
          <p>Assessments completed: <strong>${stats.assessments}</strong></p>
          <p>Milestones completed: <strong>${stats.milestones}</strong></p>
          <p>Study days this week: <strong>${stats.studyDays}</strong></p>
          <p>Current streak: <strong>${stats.streak} days</strong></p>
        </div>
        <p style="margin-top:20px;">Keep up the great work! Log in to continue your journey.</p>
        <a href="${CLIENT_URL}" 
           style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;margin-top:10px;">
          Continue Learning
        </a>
      </div>
    `,
  });
};
