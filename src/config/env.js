// src/config/env.js
const required = (name, fallback = undefined) => {
  const val = process.env[name] ?? fallback;
  return val;
};

// Use this file to centralize env usage
module.exports = {
  PORT: Number(required("PORT", 3002)),
  MONGODB_URI: required("MONGODB_URI", ""),
  JWT_SECRET: required("JWT_SECRET", "please-set-jwt-secret"),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET", process.env.JWT_SECRET),
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  TWILIO_VERIFY_SID: process.env.TWILIO_VERIFY_SID || "",
  FRONTEND_URL: required("FRONTEND_URL", "http://localhost:3000"),
  UPLOAD_DIR: required("UPLOAD_DIR", "uploads"),
};
