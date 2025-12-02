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

/* ======================================================
    HELPER FUNCTIONS
======================================================= */

// Normalize Kenyan numbers → 07xxxxxxxx or 01xxxxxxxx only
function normalizePhone(phone) {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");

  if (d.startsWith("07") || d.startsWith("01")) return d.slice(0, 10);
  if (d.startsWith("7")) return "07" + d.slice(1, 9);
  if (d.startsWith("1")) return "01" + d.slice(1, 9);

  return d.slice(0, 10);
}

// Last 9 digits for DB searches
function getPhoneTail(phone) {
  return phone.replace(/\D/g, "").slice(-9);
}

// Full phone in +254 format
function makePhoneFull(phone) {
  const d = phone.replace(/\D/g, "");
  return "+254" + d.slice(-9);
}

// PIN regex
const pinRegex = /^\d{4}$/;

// JWT generator
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

/* ======================================================
    1) REGISTER → SEND OTP
======================================================= */

exports.registerStart = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ success: false, message: "Email required" });

    let user = await User.findOne({ email });

    if (user && user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already registered.",
      });
    }

    // Create new unverified account placeholder
    if (!user) {
      user = new User({ email, emailVerified: false });
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    user.emailVerificationCode = code;
    user.emailVerificationCodeExpires = new Date(Date.now() + 2 * 60 * 1000);
    await user.save();

    // Treat email send as "success unless it throws"
    try {
      await sendVerificationEmail(email, code);
    } catch (err) {
      console.error("sendVerificationEmail error:", err);
      return res.status(500).json({
        success: false,
        message: "Could not send verification email",
      });
    }

    return res.json({
      success: true,
      message: "Verification code sent",
    });
  } catch (err) {
    console.error("registerStart error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
    2) VERIFY OTP
======================================================= */

exports.verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code)
      return res.status(400).json({
        success: false,
        message: "Email and verification code required",
      });

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid email" });

    if (user.emailVerificationCode !== code)
      return res
        .status(400)
        .json({ success: false, message: "Invalid verification code" });

    if (user.emailVerificationCodeExpires < new Date())
      return res
        .status(400)
        .json({ success: false, message: "Verification code expired" });

    // Create 1-hour verification token
    const token = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = token;
    user.emailVerificationExpires = new Date(Date.now() + 1 * 60 * 60 * 1000);

    // Clear OTP
    user.emailVerificationCode = undefined;
    user.emailVerificationCodeExpires = undefined;

    await user.save();

    return res.json({
      success: true,
      token,
      message: "OTP verified. Continue registration.",
    });
  } catch (err) {
    console.error("verifyEmailCode error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
    3) COMPLETE REGISTRATION
======================================================= */

exports.registerComplete = async (req, res) => {
  try {
    const { token, phone, pin, confirmPin } = req.body;

    if (!token || !phone || !pin || !confirmPin)
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });

    if (!pinRegex.test(pin))
      return res.status(400).json({
        success: false,
        message: "PIN must be 4 digits",
      });

    if (pin !== confirmPin)
      return res.status(400).json({
        success: false,
        message: "PINs do not match",
      });

    const normalized = normalizePhone(phone);
    if (!normalized)
      return res.status(400).json({
        success: false,
        message: "Invalid phone format",
      });

    const phoneTail = getPhoneTail(normalized);
    const phoneFull = makePhoneFull(normalized);

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired session" });

    // Ensure phone is unique
    const exists = await User.findOne({ phoneTail });
    if (exists && exists._id.toString() !== user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Phone number already in use",
      });
    }

    user.phoneFull = phoneFull;
    user.phoneTail = phoneTail;
    user.password = await bcrypt.hash(pin, 10);

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    const { accessToken, refreshToken } = makeTokens(user._id);

    return res.json({
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
    console.error("registerComplete error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
    4) LOGIN
======================================================= */

exports.loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password)
      return res.status(400).json({
        success: false,
        message: "Phone and PIN required",
      });

    const normalized = normalizePhone(phone);
    const phoneTail = getPhoneTail(normalized);

    const user = await User.findOne({ phoneTail });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Incorrect phone or PIN" });

    if (!user.emailVerified)
      return res
        .status(400)
        .json({ success: false, message: "Verify your email first" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res
        .status(400)
        .json({ success: false, message: "Incorrect phone or PIN" });

    const { accessToken, refreshToken } = makeTokens(user._id);

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        phone: user.phoneFull,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("loginUser error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
    5) RESET PIN → SEND LINK
======================================================= */

exports.resetPasswordStart = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        success: true,
        message: "If registered, reset link sent",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600 * 1000);
    await user.save();

    const url = `${FRONTEND_URL}/user/auth/reset-pin?token=${token}`;

    try {
      await sendResetPasswordEmail(email, url);
    } catch (err) {
      console.error("sendResetPasswordEmail error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to send reset link",
      });
    }

    return res.json({
      success: true,
      message: "If registered, reset link sent",
    });
  } catch (err) {
    console.error("resetPasswordStart error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
    6) RESET PIN COMPLETE
======================================================= */

exports.resetPasswordComplete = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword)
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });

    if (!pinRegex.test(password))
      return res.status(400).json({
        success: false,
        message: "PIN must be 4 digits",
      });

    if (password !== confirmPassword)
      return res.status(400).json({
        success: false,
        message: "PINs do not match",
      });

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link",
      });

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.json({
      success: true,
      message: "PIN reset successful",
    });
  } catch (err) {
    console.error("resetPasswordComplete error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
