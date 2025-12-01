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

// Regex for Kenyan numbers: 07xxxxxxxx or 01xxxxxxxx
const phoneRegex = /^(07|01)\d{8}$/;
const pinRegex = /^\d{4}$/;

// Generate access + refresh tokens
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

/* -------------------------------------------------------
   1) START REGISTRATION: EMAIL → SEND OTP
--------------------------------------------------------*/
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

    // Create user object if new
    if (!user) {
      user = new User({ email, emailVerified: false });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    user.emailVerificationCode = code;
    user.emailVerificationCodeExpires = new Date(Date.now() + 60 * 1000); // 1 min
    await user.save();

    await sendVerificationEmail(email, code);

    return res.json({
      success: true,
      message: "Verification code sent.",
    });
  } catch (err) {
    console.error("registerStart error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------------------------------------------
   2) VERIFY EMAIL OTP → ISSUE VERIFICATION TOKEN
--------------------------------------------------------*/
exports.verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code)
      return res
        .status(400)
        .json({ success: false, message: "Email and code required" });

    const user = await User.findOne({ email });

    if (!user || user.emailVerificationCode !== code)
      return res
        .status(400)
        .json({ success: false, message: "Invalid verification code" });

    if (user.emailVerificationCodeExpires < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Verification code expired" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.emailVerificationToken = token;
    user.emailVerificationExpires = new Date(Date.now() + 3600 * 1000); // 1 hr

    user.emailVerificationCode = undefined;
    user.emailVerificationCodeExpires = undefined;

    await user.save();

    return res.json({
      success: true,
      token,
      message: "Email verified. Continue registration.",
    });
  } catch (err) {
    console.error("verifyEmailCode error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------------------------------------------
   3) COMPLETE REGISTRATION: token + phone + 4-digit PIN
--------------------------------------------------------*/
exports.registerComplete = async (req, res) => {
  try {
    const { token, phone, pin, confirmPin } = req.body;

    if (!token || !phone || !pin || !confirmPin) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (pin !== confirmPin) {
      return res.status(400).json({
        success: false,
        message: "PINs do not match.",
      });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be 4 digits.",
      });
    }

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone format.",
      });
    }

    const phoneTail = getPhoneTail(normalized);
    const phoneFull = makePhoneFull(normalized);

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired registration session",
      });
    }

    // ensure phone not used
    const existing = await User.findOne({ phoneTail });
    if (existing && existing._id.toString() !== user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Phone number already in use.",
      });
    }

    // hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    user.phoneFull = phoneFull;
    user.phoneTail = phoneTail;
    user.password = hashedPin;

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    const { accessToken, refreshToken } = makeTokens(user._id);

    return res.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id,
        email: user.email,
        phone: phoneFull,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("registerComplete error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------------------------------------------
   4) LOGIN: phone + PIN (hashed)
--------------------------------------------------------*/
exports.loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone and PIN are required.",
      });
    }

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number.",
      });
    }

    const phoneTail = getPhoneTail(normalized);

    const user = await User.findOne({ phoneTail });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Incorrect phone or PIN.",
      });
    }

    if (!user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email first.",
      });
    }

    const pinCorrect = await bcrypt.compare(password, user.password);

    if (!pinCorrect) {
      return res.status(400).json({
        success: false,
        message: "Incorrect phone or PIN.",
      });
    }

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

/* -------------------------------------------------------
   5) RESET PIN: start (email → send reset link)
--------------------------------------------------------*/
exports.resetPasswordStart = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ success: false, message: "Email required" });

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        success: true,
        message: "If registered, a reset link will be sent.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600 * 1000);
    await user.save();

    const resetUrl = `${FRONTEND_URL}/user/auth/reset-password?token=${token}`;
    await sendResetPasswordEmail(email, resetUrl);

    return res.json({
      success: true,
      message: "If registered, a reset link will be sent.",
    });
  } catch (err) {
    console.error("resetPasswordStart error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------------------------------------------
   6) RESET PIN: complete
--------------------------------------------------------*/
exports.resetPasswordComplete = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword)
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });

    if (!pinRegex.test(password))
      return res
        .status(400)
        .json({ success: false, message: "PIN must be 4 digits" });

    if (password !== confirmPassword)
      return res
        .status(400)
        .json({ success: false, message: "PINs do not match" });

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset link" });

    const hashedPin = await bcrypt.hash(password, 10);
    user.password = hashedPin;

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.json({
      success: true,
      message: "PIN reset successfully",
    });
  } catch (err) {
    console.error("resetPasswordComplete error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
