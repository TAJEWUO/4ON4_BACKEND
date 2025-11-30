// src/controllers/authController.js
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  sendVerificationEmail,
  sendResetPasswordEmail,
} = require("../utils/emailUtils");

const FRONTEND_URL = process.env.FRONTEND_URL || "https://4on4.site";

// Create access + refresh tokens
const makeTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "2h",
  });

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: "14d",
    }
  );

  return { accessToken, refreshToken };
};

// Helpers
const phoneRegex = /^0(7|1)\d{8}$/; // 07xxxxxxxx or 01xxxxxxxx
const pinRegex = /^\d{4}$/;        // exactly 4 digits

// 1) START REGISTRATION: email -> send verification link
exports.registerStart = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    let existingUser = await User.findOne({ email });

    if (existingUser && existingUser.emailVerified) {
      return res.status(400).json({
        success: false,
        message:
          "Email is already registered. Try logging in or resetting PIN.",
      });
    }

    // Create or reuse unverified user
    if (!existingUser) {
      existingUser = new User({ email, emailVerified: false });
    }

    const token = crypto.randomBytes(32).toString("hex");
    existingUser.emailVerificationToken = token;
    existingUser.emailVerificationExpires = new Date(
      Date.now() + 60 * 60 * 1000
    ); // 1 hour
    await existingUser.save();

    const verifyUrl = `${FRONTEND_URL}/user/auth/verify?token=${token}`;

    await sendVerificationEmail(email, verifyUrl);

    return res.json({
      success: true,
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (err) {
    console.error("registerStart error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 2) COMPLETE REGISTRATION: token + phone + 4-digit PIN
exports.registerComplete = async (req, res) => {
  try {
    const { token, phone, password, confirmPassword } = req.body;

    if (!token || !phone || !password || !confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone must start with 07 or 01 and be 10 digits.",
      });
    }

    if (!pinRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be exactly 4 digits.",
      });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "PINs do not match." });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification link",
      });
    }

    // Ensure phone not in use by another user
    const existingPhone = await User.findOne({ phone });
    if (existingPhone && existingPhone._id.toString() !== user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Phone number already registered.",
      });
    }

    user.phone = phone;
    user.identifier = phone;
    user.password = password; // PLAIN 4-digit PIN (not secure)
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
        phone: user.phone,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("registerComplete error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 3) LOGIN: phone + 4-digit PIN
exports.loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone and PIN are required.",
      });
    }

    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone must start with 07 or 01 and be 10 digits.",
      });
    }

    if (!pinRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be exactly 4 digits.",
      });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Incorrect phone or PIN. Check again.",
      });
    }

    if (!user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email not verified. Please complete registration.",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "No PIN set. Please reset your PIN.",
      });
    }

    if (user.password !== password) {
      return res.status(400).json({
        success: false,
        message: "Incorrect phone or PIN. Check again.",
      });
    }

    const { accessToken, refreshToken } = makeTokens(user._id);

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("loginUser error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 4) RESET PIN: start (by email)
exports.resetPasswordStart = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal whether user exists
      return res.json({
        success: true,
        message: "If that email is registered, a reset link has been sent.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${FRONTEND_URL}/user/auth/reset-password?token=${token}`;

    await sendResetPasswordEmail(email, resetUrl);

    return res.json({
      success: true,
      message: "If that email is registered, a reset link has been sent.",
    });
  } catch (err) {
    console.error("resetPasswordStart error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 5) RESET PIN: complete (token + 4-digit PIN)
exports.resetPasswordComplete = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    if (!pinRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be exactly 4 digits.",
      });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "PINs do not match." });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link",
      });
    }

    user.password = password; // plain 4-digit PIN
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.json({
      success: true,
      message: "PIN reset successful. You can now log in with your new PIN.",
    });
  } catch (err) {
    console.error("resetPasswordComplete error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
