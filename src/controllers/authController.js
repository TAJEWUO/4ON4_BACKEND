11// src/controllers/authController.js
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

function getPhoneTailFromE164(e164) {
  return e164.replace(/\D/g, "").slice(-9);
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

    const check = await twilioClient.verify.v2.services(TWILIO_VERIFY_SID).verificationChecks.create({ to: phoneE164, code });

    if (!check || check.status !== "approved") return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    return res.json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("checkVerify error:", err);
    return res.status(500).json({ success: false, message: "Failed to check OTP" });
  }
};

exports.registerComplete = async (req, res) => {
  try {
    const { token, pin, confirmPin } = req.body;
    if (!token || !pin || !confirmPin) return res.status(400).json({ success: false, message: "Token and PINs required" });
    if (!pinRegex.test(pin)) return res.status(400).json({ success: false, message: "PIN must be 4 digits" });
    if (pin !== confirmPin) return res.status(400).json({ success: false, message: "PINs do not match" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const existing = await User.findOne({ phoneTail: payload.phoneTail });
    if (existing) return res.status(400).json({ success: false, message: "Phone already registered" });

    const hashed = await bcrypt.hash(pin, 10);
    const user = new User({ phoneFull: payload.phone, phoneTail: payload.phoneTail, password: hashed });
    await user.save();

    const { accessToken, refreshToken } = makeTokens(user._id);

    // Set httpOnly refresh cookie (secure in production)
    setRefreshCookie(res, refreshToken);

    // Return access token (refresh is in cookie)
    return res.json({ success: true, message: "Account created", user: { id: user._id, phone: user.phoneFull }, accessToken });
  } catch (err) {
    console.error("registerComplete error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { phone, pin } = req.body;
    const phoneE164 = normalizePhoneE164(phone);
    const tail = getPhoneTailFromE164(phoneE164);
    const user = await User.findOne({ phoneTail: tail });

    if (!user) return res.status(400).json({ success: false, message: "Incorrect phone or PIN" });
    const match = await bcrypt.compare(pin, user.password);
    if (!match) return res.status(400).json({ success: false, message: "Incorrect phone or PIN" });

    const { accessToken, refreshToken } = makeTokens(user._id);

    // Set httpOnly refresh cookie
    setRefreshCookie(res, refreshToken);

    return res.json({ success: true, message: "Login successful", user: { id: user._id, phone: user.phoneFull }, accessToken });
  } catch (err) {
    console.error("loginUser error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.resetPinComplete = async (req, res) => {
  try {
    const { token, pin, confirmPin } = req.body;
    if (!token || !pin || !confirmPin) return res.status(400).json({ success: false, message: "Token + PIN required" });
    if (!pinRegex.test(pin)) return res.status(400).json({ success: false, message: "PIN must be 4 digits" });
    if (pin !== confirmPin) return res.status(400).json({ success: false, message: "PINs do not match" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId);
    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    user.password = await bcrypt.hash(pin, 10);
    await user.save();

    return res.json({ success: true, message: "PIN reset successfully" });
  } catch (err) {
    console.error("resetPinComplete error:", err);
    return res.status(500).json({ success: false, message: "Failed to reset PIN" });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    // cookie preferred; fallback to body for migration
    const cookieToken = req.cookies?.refreshToken;
    const bodyToken = req.body?.refreshToken;
    const token = cookieToken || bodyToken;

    if (!token) {
      return res.status(400).json({ success: false, message: "refreshToken required" });
    }

    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const userId = payload.id;
    if (!userId) return res.status(401).json({ success: false, message: "Invalid token payload" });

    const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "2h" });
    return res.json({ success: true, accessToken });
  } catch (err) {
    console.error("refreshToken error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};