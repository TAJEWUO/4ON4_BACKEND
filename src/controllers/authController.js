const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const twilio = require("twilio");

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SID = process.env.TWILIO_VERIFY_SID;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SID) {
  console.warn("[authController] Twilio env vars missing or incomplete.");
}

const twilioClient = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

function normalizePhoneE164(phone) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  let local = digits;
  if (digits.startsWith("254")) local = digits.slice(3);
  else if (digits.startsWith("0")) local = digits.slice(1);
  const tail9 = local.slice(-9);
  if (tail9.length !== 9) return "";
  return "+254" + tail9;
}

const pinRegex = /^\d{4}$/;

const makeTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "2h" });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: "14d" });
  return { accessToken, refreshToken };
};

function setRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
  });
}

exports.startVerify = async (req, res) => {
  try {
    const { phone, mode } = req.body;
    if (!phone || !mode) return res.status(400).json({ success: false, message: "Phone and mode required" });

    // If Twilio not configured, simulate in non-production for dev/testing
    if (!twilioClient) {
      if (process.env.NODE_ENV === "production") {
        return res.status(500).json({ success: false, message: "OTP service not configured" });
      }
      console.warn("[authController] Twilio not configured — simulating OTP for development.");
      const tempToken = jwt.sign({ purpose: "verify-dev", phone }, process.env.JWT_SECRET, { expiresIn: "10m" });
      return res.json({ success: true, message: "OTP simulated (dev)", token: tempToken });
    }

    const phoneE164 = normalizePhoneE164(phone);
    if (!phoneE164) return res.status(400).json({ success: false, message: "Invalid Kenyan phone number" });

    await twilioClient.verify.v2.services(TWILIO_VERIFY_SID).verifications.create({ to: phoneE164, channel: "sms" });

    return res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("startVerify error:", err);
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

exports.checkVerify = async (req, res) => {
  try {
    const { phone, code, mode, token } = req.body;
    if (!phone || (!code && !token) || !mode) return res.status(400).json({ success: false, message: "Phone, code/token and mode required" });

    const phoneE164 = normalizePhoneE164(phone);

    // Dev flow: if twilio not configured and a token was issued by startVerify dev path
    if (!twilioClient) {
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded && decoded.purpose === "verify-dev") {
            if (mode === "register") {
              const tempToken = jwt.sign({ purpose: "register", phone: phoneE164 }, process.env.JWT_SECRET, { expiresIn: "15m" });
              return res.json({ success: true, token: tempToken, message: "Dev: OTP verified" });
            }
            if (mode === "reset") {
              const resetToken = jwt.sign({ purpose: "resetPin", phone: phoneE164 }, process.env.JWT_SECRET, { expiresIn: "15m" });
              return res.json({ success: true, resetToken, message: "Dev: OTP verified" });
            }
          }
        } catch (ex) {
          console.error("checkVerify dev token failed:", ex?.message);
          return res.status(400).json({ success: false, message: "Invalid or expired token" });
        }
      }
      return res.status(400).json({ success: false, message: "Dev mode: missing token" });
    }

    // Normal Twilio flow
    const check = await twilioClient.verify.v2.services(TWILIO_VERIFY_SID).verificationChecks.create({ to: phoneE164, code });

    if (!check || check.status !== "approved") return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    // proceed with register/reset logic (existing code would continue here)
    return res.json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("checkVerify error:", err);
    return res.status(500).json({ success: false, message: "Failed to check OTP" });
  }
};

// NOTE: keep the rest of your authController exports (loginUser, registerComplete, resetPinComplete, loginUser, refreshToken, etc.) below as-is.
