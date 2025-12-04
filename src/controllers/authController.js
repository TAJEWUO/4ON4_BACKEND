// src/controllers/authController.js
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const twilio = require("twilio");

// ============================
// TWILIO VERIFY SETUP
// ============================
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SID = process.env.TWILIO_VERIFY_SID;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SID) {
  console.warn(
    "[authController] Twilio Verify env vars missing. OTP will fail until set."
  );
}

const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

// ============================
// HELPERS
// ============================

// Normalize Kenyan phone to E.164: +2547xxxxxxxx
function normalizePhoneE164(phone) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, ""); // keep only numbers

  let local = digits;

  // If starts with +254 or 254 → strip 254
  if (digits.startsWith("254")) {
    local = digits.slice(3);
  } else if (digits.startsWith("0")) {
    // 07..., 01...
    local = digits.slice(1);
  }

  // Now local should start with 7 or 1 and be 9 digits total
  // Just take last 9 digits to be safe
  const tail9 = local.slice(-9);

  if (!tail9 || tail9.length !== 9) return "";

  return "+254" + tail9;
}

// last 9 digits for DB
function getPhoneTailFromE164(e164) {
  const d = e164.replace(/\D/g, ""); // 2547xxxxxxxx
  return d.slice(-9); // 7xxxxxxxx
}

const pinRegex = /^\d{4}$/;

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
   1) START OTP (REGISTER / RESET)
   POST /api/auth/verify/start
   body: { phone, mode: "register" | "reset" }
====================================================== */
exports.startVerify = async (req, res) => {
  try {
    const { phone, mode } = req.body;

    if (!phone || !mode) {
      return res.status(400).json({
        success: false,
        message: "Phone and mode are required",
      });
    }

    if (!twilioClient || !TWILIO_VERIFY_SID) {
      return res.status(500).json({
        success: false,
        message: "OTP service not configured",
      });
    }

    const phoneE164 = normalizePhoneE164(phone);
    if (!phoneE164) {
      return res.status(400).json({
        success: false,
        message: "Invalid Kenyan phone number",
      });
    }

    // For reset, ensure user exists (optional but better UX)
    if (mode === "reset") {
      const tail = getPhoneTailFromE164(phoneE164);
      const user = await User.findOne({ phoneTail: tail });
      if (!user) {
        // Don't reveal if exists or not, but still send OK
        // Twilio still sends SMS but attacker doesn't learn existence.
        console.log("[startVerify] reset requested for non-existent phone");
      }
    }

    const twilioRes = await twilioClient.verify.v2
      .services(TWILIO_VERIFY_SID)
      .verifications.create({
        to: phoneE164,
        channel: "sms",
      });

    if (!twilioRes || !twilioRes.status) {
      return res.status(500).json({
        success: false,
        message: "Failed to start verification",
      });
    }

    return res.json({
      success: true,
      message: "OTP sent",
      phone: phoneE164,
    });
  } catch (err) {
    console.error("startVerify error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send verification code",
    });
  }
};

/* ======================================================
   2) CHECK OTP
   POST /api/auth/verify/check
   body: { phone, code, mode: "register" | "reset" }
====================================================== */
exports.checkVerify = async (req, res) => {
  try {
    const { phone, code, mode } = req.body;

    if (!phone || !code || !mode) {
      return res.status(400).json({
        success: false,
        message: "Phone, code and mode are required",
      });
    }

    if (!twilioClient || !TWILIO_VERIFY_SID) {
      return res.status(500).json({
        success: false,
        message: "OTP service not configured",
      });
    }

    const phoneE164 = normalizePhoneE164(phone);
    if (!phoneE164) {
      return res.status(400).json({
        success: false,
        message: "Invalid Kenyan phone number",
      });
    }

    const check = await twilioClient.verify.v2
      .services(TWILIO_VERIFY_SID)
      .verificationChecks.create({
        to: phoneE164,
        code,
      });

    if (!check || check.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    const tail = getPhoneTailFromE164(phoneE164);

    if (mode === "register") {
      // Temporary token to finish registration
      const tempToken = jwt.sign(
        {
          purpose: "register",
          phone: phoneE164,
          phoneTail: tail,
        },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      return res.json({
        success: true,
        message: "OTP verified. Continue to set PIN",
        token: tempToken,
        phone: phoneE164,
      });
    }

    if (mode === "reset") {
      const user = await User.findOne({ phoneTail: tail });
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Account not found for this phone",
        });
      }

      const resetToken = jwt.sign(
        { purpose: "resetPin", userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      return res.json({
        success: true,
        message: "OTP verified. Continue to reset PIN",
        resetToken,
        phone: phoneE164,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Unknown mode",
    });
  } catch (err) {
    console.error("checkVerify error:", err);
    return res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
};

/* ======================================================
   3) COMPLETE REGISTRATION (SET PIN)
   POST /api/auth/register-complete
   body: { token, pin, confirmPin }
====================================================== */
exports.registerComplete = async (req, res) => {
  try {
    const { token, pin, confirmPin } = req.body;

    if (!token || !pin || !confirmPin) {
      return res.status(400).json({
        success: false,
        message: "Token and PINs are required",
      });
    }

    if (!pinRegex.test(pin)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be 4 digits",
      });
    }

    if (pin !== confirmPin) {
      return res.status(400).json({
        success: false,
        message: "PINs do not match",
      });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired registration token",
      });
    }

    if (!payload || payload.purpose !== "register" || !payload.phoneTail) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration context",
      });
    }

    const phoneE164 = payload.phone;
    const phoneTail = payload.phoneTail;

    // Check if phone already used
    const existing = await User.findOne({ phoneTail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Phone number already registered",
      });
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    const user = new User({
      phoneFull: phoneE164,
      phoneTail,
      password: hashedPin,
      emailVerified: true, // keep true to satisfy old logic if present
    });

    await user.save();

    const { accessToken, refreshToken } = makeTokens(user._id);

    return res.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id,
        phone: user.phoneFull,
        email: user.email || null,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("registerComplete error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

/* ======================================================
   4) LOGIN (PHONE + PIN)
   POST /api/auth/login
   body: { phone, pin }
====================================================== */
exports.loginUser = async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({
        success: false,
        message: "Phone and PIN are required",
      });
    }

    if (!pinRegex.test(pin)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be 4 digits",
      });
    }

    const phoneE164 = normalizePhoneE164(phone);
    if (!phoneE164) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    const tail = getPhoneTailFromE164(phoneE164);
    const user = await User.findOne({ phoneTail: tail });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Incorrect phone or PIN",
      });
    }

    const match = await bcrypt.compare(pin, user.password || "");
    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Incorrect phone or PIN",
      });
    }

    const { accessToken, refreshToken } = makeTokens(user._id);

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        phone: user.phoneFull,
        email: user.email || null,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("loginUser error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ======================================================
   5) RESET PIN COMPLETE
   POST /api/auth/reset-pin-complete
   body: { token, pin, confirmPin }
====================================================== */
exports.resetPinComplete = async (req, res) => {
  try {
    const { token, pin, confirmPin } = req.body;

    if (!token || !pin || !confirmPin) {
      return res.status(400).json({
        success: false,
        message: "Token and PINs are required",
      });
    }

    if (!pinRegex.test(pin)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be 4 digits",
      });
    }

    if (pin !== confirmPin) {
      return res.status(400).json({
        success: false,
        message: "PINs do not match",
      });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    if (!payload || payload.purpose !== "resetPin" || !payload.userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset context",
      });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    user.password = await bcrypt.hash(pin, 10);
    await user.save();

    return res.json({
      success: true,
      message: "PIN reset successfully",
    });
  } catch (err) {
    console.error("resetPinComplete error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error resetting PIN",
    });
  }
};
