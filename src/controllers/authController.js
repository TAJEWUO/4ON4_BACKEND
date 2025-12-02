// src/controllers/authController.js
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  sendVerificationEmail,
  sendResetPasswordEmail,
} = require("../utils/emailUtils");

const FRONTEND_URL = process.env.FRONTEND_URL || "https://4on4.site";

/* ============================================================
   HELPER FUNCTIONS
============================================================ */

// Normalize Kenyan numbers
function normalizePhone(phone) {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");

  if (d.startsWith("07") || d.startsWith("01")) return d.slice(0, 10);
  if (d.startsWith("7")) return "07" + d.slice(1, 9);
  if (d.startsWith("1")) return "01" + d.slice(1, 9);

  return d.slice(0, 10);
}

// DB search uses last 9 digits
function getPhoneTail(phone) {
  return phone.replace(/\D/g, "").slice(-9);
}

// Save full form +2547xxxxxxxx
function makePhoneFull(phone) {
  return "+254" + phone.replace(/\D/g, "").slice(-9);
}

const pinRegex = /^\d{4}$/;

// Tokens
const makeTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "2h",
  });

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: "14d" }
  );

  return { accessToken, refreshToken };
};

/* ============================================================
   1) START REGISTRATION (send OTP)
============================================================ */
exports.registerStart = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ success: false, message: "Email required" });

    let user = await User.findOne({ email });

    if (user && user.emailVerified)
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });

    if (!user) user = new User({ email, emailVerified: false });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationCode = code;
    user.emailVerificationCodeExpires = new Date(Date.now() + 120 * 1000);
    await user.save();

    await sendVerificationEmail(email, code);

    res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("registerStart:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ============================================================
   2) VERIFY EMAIL OTP
============================================================ */
exports.verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code)
      return res
        .status(400)
        .json({ success: false, message: "Email + Code required" });

    const user = await User.findOne({ email });

    if (!user || user.emailVerificationCode !== code)
      return res
        .status(400)
        .json({ success: false, message: "Invalid verification code" });

    if (user.emailVerificationCodeExpires < new Date())
      return res
        .status(400)
        .json({ success: false, message: "Verification code expired" });

    const token = crypto.randomBytes(32).toString("hex");

    user.emailVerificationToken = token;
    user.emailVerificationExpires = new Date(Date.now() + 3600 * 1000);

    user.emailVerificationCode = undefined;
    user.emailVerificationCodeExpires = undefined;

    await user.save();

    res.json({ success: true, token });
  } catch (err) {
    console.error("verifyEmailCode:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ============================================================
   3) COMPLETE REGISTRATION (phone + PIN)
============================================================ */
exports.registerComplete = async (req, res) => {
  try {
    const { token, phone, pin, confirmPin } = req.body;

    if (!token || !phone || !pin || !confirmPin)
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });

    if (pin !== confirmPin)
      return res.status(400).json({ success: false, message: "PIN mismatch" });

    if (!pinRegex.test(pin))
      return res
        .status(400)
        .json({ success: false, message: "PIN must be 4 digits" });

    const normalized = normalizePhone(phone);
    if (!normalized)
      return res
        .status(400)
        .json({ success: false, message: "Invalid phone number" });

    const phoneTail = getPhoneTail(normalized);
    const phoneFull = makePhoneFull(normalized);

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired session" });

    const existing = await User.findOne({ phoneTail });

    if (existing && existing._id.toString() !== user._id.toString())
      return res
        .status(400)
        .json({ success: false, message: "Phone already used" });

    user.phoneFull = phoneFull;
    user.phoneTail = phoneTail;
    user.password = await bcrypt.hash(pin, 10);
    user.emailVerified = true;

    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    const { accessToken, refreshToken } = makeTokens(user._id);

    res.json({
      success: true,
      message: "Account created",
      user: {
        id: user._id,
        email: user.email,
        phone: user.phoneFull,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("registerComplete:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ============================================================
   4) LOGIN
============================================================ */
exports.loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const normalized = normalizePhone(phone);
    const phoneTail = getPhoneTail(normalized);

    const user = await User.findOne({ phoneTail });

    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Incorrect phone or PIN" });

    if (!user.emailVerified)
      return res.status(400).json({ success: false, message: "Verify email" });

    const correct = await bcrypt.compare(password, user.password);

    if (!correct)
      return res
        .status(400)
        .json({ success: false, message: "Incorrect phone or PIN" });

    const { accessToken, refreshToken } = makeTokens(user._id);

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phoneFull,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("loginUser:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ============================================================
   5) FORGOT PIN (send email link)
============================================================ */
exports.forgotPin = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user)
      return res.json({
        success: true,
        message: "If registered, OTP will be sent",
      });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600 * 1000);

    await user.save();

    const url = `${FRONTEND_URL}/user/auth/reset-pin?token=${token}`;
    await sendResetPasswordEmail(email, url);

    res.json({ success: true, message: "Email sent" });
  } catch (err) {
    console.error("forgotPin:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ============================================================
   6) RESET PIN
============================================================ */
exports.resetPin = async (req, res) => {
  try {
    const { token, pin, confirmPin } = req.body;

    if (!token || !pin || !confirmPin)
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });

    if (!pinRegex.test(pin))
      return res
        .status(400)
        .json({ success: false, message: "PIN must be 4 digits" });

    if (pin !== confirmPin)
      return res.status(400).json({ success: false, message: "PINs do not match" });

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset link" });

    user.password = await bcrypt.hash(pin, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ success: true, message: "PIN reset successful" });
  } catch (err) {
    console.error("resetPin:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
