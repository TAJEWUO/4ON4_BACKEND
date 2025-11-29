// src/controllers/authController.js
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendVerificationEmail, sendResetPasswordEmail } = require("../utils/emailUtils");

const FRONTEND_URL = process.env.FRONTEND_URL || "https://4on4.site";

// Helper: create JWT access token (2h) + refresh token (14d)
const makeTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "2h",
  });

  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: "14d",
  });

  return { accessToken, refreshToken };
};

// 1) START REGISTRATION: email -> send verification link
exports.registerStart = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Check if email already used
    let existingUser = await User.findOne({ email });
    if (existingUser && existingUser.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered. Try logging in or resetting password.",
      });
    }

    // If user exists but not verified, reuse it; else create new
    if (!existingUser) {
      existingUser = new User({ email, emailVerified: false });
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex");
    existingUser.emailVerificationToken = token;
    existingUser.emailVerificationExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await existingUser.save();

    const verifyUrl = `${FRONTEND_URL}/user/auth/verify?token=${token}`;

    // Send email with link
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

// 2) COMPLETE REGISTRATION: token + phone + password
exports.registerComplete = async (req, res) => {
  try {
    const { token, phone, password, confirmPassword } = req.body;

    if (!token || !phone || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
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

    // Ensure phone not already in use
    const existingPhone = await User.findOne({ phone });
    if (existingPhone && existingPhone._id.toString() !== user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Phone number already in use. Use a different one.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.phone = phone;
    user.identifier = phone; // for backwards compatibility
    user.password = hashedPassword;
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

// 3) LOGIN: phone OR email + password
exports.loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    // identifier can be phone OR email
    const user = await User.findOne({
      $or: [{ phone: identifier }, { email: identifier }, { identifier }],
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
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
        message: "No password set. Please complete registration or reset your password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
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

// 4) RESET PASSWORD: start (email)
exports.resetPasswordStart = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: "If that email is registered, a reset link has been sent.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${FRONTEND_URL}/user/auth/reset?token=${token}`;

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

// 5) RESET PASSWORD: complete (token + new password)
exports.resetPasswordComplete = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
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

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.json({
      success: true,
      message: "Password reset successful. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("resetPasswordComplete error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
