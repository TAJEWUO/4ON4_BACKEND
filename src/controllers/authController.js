// src/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const twilio = require("twilio");

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SID = process.env.TWILIO_VERIFY_SID;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SID) {
  console.warn("[authController] Twilio env vars missing.");
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

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 14 * 24 * 60 * 60 * 1000,
  });
};

exports.startVerify = async (req, res) => {
  try {
    const { phone, mode } = req.body;
    if (!phone || !mode) return res.status(400).json({ success: false, message: "Phone and mode required" });
    if (!twilioClient) return res.status(500).json({ success: false, message: "OTP service not configured" });

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
    const { phone, code, mode } = req.body;
    if (!phone || !code || !mode) return res.status(400).json({ success: false, message: "Phone, code and mode required" });

    const phoneE164 = normalizePhoneE164(phone);
    const check = await twilioClient.verify.v2.services(TWILIO_VERIFY_SID).verificationChecks.create({ to: phoneE164, code });

    if (!check || check.status !== "approved") return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    const tail = getPhoneTailFromE164(phoneE164);

    if (mode === "register") {
      const tempToken = jwt.sign({ purpose: "register", phone: phoneE164, phoneTail: tail }, process.env.JWT_SECRET, { expiresIn: "15m" });
      return res.json({ success: true, token: tempToken, message: "OTP verified. Continue registration." });
    }

    if (mode === "reset") {
      const user = await User.findOne({ phoneTail: tail });
      if (!user) return res.status(400).json({ success: false, message: "Account not found" });

      const resetToken = jwt.sign({ purpose: "resetPin", userId: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
      return res.json({ success: true, resetToken, message: "OTP verified. Continue reset." });
    }
  } catch (err) {
    console.error("checkVerify error:", err);
    return res.status(500).json({ success: false, message: "Verification failed" });
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

    // Set refresh token as httpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

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
    
    // Set refresh token as httpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

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
    // Read refresh token from httpOnly cookie, fallback to request body for migration
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // Issue new access token
    const accessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, { expiresIn: "2h" });
    
    return res.json({ success: true, accessToken });
  } catch (err) {
    console.error("refreshToken error:", err);
    return res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
};
