const trimTrailingSlash = (value) => value.replace(/\/$/, "");

const defaultClientUrl =
  process.env.NODE_ENV === "production"
    ? "https://careerai-com.vercel.app"
    : "http://localhost:5173";

const defaultServerUrl =
  process.env.NODE_ENV === "production"
    ? "https://smartcareer-api.onrender.com"
    : "http://localhost:5000";

export const CLIENT_URL = trimTrailingSlash(process.env.CLIENT_URL || defaultClientUrl);
export const SERVER_URL = trimTrailingSlash(process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || defaultServerUrl);
export const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || `${SERVER_URL}/api/auth/google/callback`;
