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

// Convert 07xxxxxxx or 1xxxxxxxx into +2547xxxxxxxx
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

// Store last 9 digits for DB uniqueness
function getPhoneTailFromE164(e164) {
  return e164.replace(/\D/g, "").slice(-9);
}

// PIN regex
const pinRegex = /^\d{4}$/;

// JWT creators
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
====================================================== */
exports.startVerify = async (req, res) => {
  try {
    const { phone, mode } = req.body;

    if (!phone || !mode) {
      return res.status(400).json({
        success: false,
        message: "Phone and mode required",
      });
    }

    if (!twilioClient || !TWILIO_VERIFY_SID) {
      return res.status(500).json({
        success: false,
        message: "OTP service not configured",
      });
    }

    const phoneE164 = normalizePhoneE164(phone);
    if (!phoneE164)
      return res.status(400).json({
        success: false,
        message: "Invalid Kenyan phone number",
      });

    const twilioRes = await twilioClient.verify.v2
      .services(TWILIO_VERIFY_SID)
      .verifications.create({
        to: phoneE164,
        channel: "sms",
      });

    return res.json({
      success: true,
      message: "OTP sent",
    });
  } catch (err) {
    console.error("startVerify error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

/* ======================================================
   2) CHECK OTP
   POST /api/auth/verify/check
====================================================== */
exports.checkVerify = async (req, res) => {
  try {
    const { phone, code, mode } = req.body;

    if (!phone || !code || !mode) {
      return res.status(400).json({
        success: false,
        message: "Phone, code and mode required",
      });
    }

    const phoneE164 = normalizePhoneE164(phone);

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
      const tempToken = jwt.sign(
        { purpose: "register", phone: phoneE164, phoneTail: tail },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      return res.json({
        success: true,
        token: tempToken,
        message: "OTP verified. Continue registration.",
      });
    }

    if (mode === "reset") {
      const user = await User.findOne({ phoneTail: tail });

      if (!user)
        return res.status(400).json({
          success: false,
          message: "Account not found",
        });

      const resetToken = jwt.sign(
        { purpose: "resetPin", userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      return res.json({
        success: true,
        resetToken,
        message: "OTP verified. Continue reset.",
      });
    }
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

    // ----------- BASIC VALIDATION -----------
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

    // ----------- VERIFY TOKEN -----------
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error("registerComplete invalid token:", err);
      return res.status(400).json({
        success: false,
        message: "Invalid or expired registration token",
      });
    }

    if (!payload || payload.purpose !== "register") {
      return res.status(400).json({
        success: false,
        message: "Invalid registration context",
      });
    }

    const phoneE164 = payload.phone;
    const phoneTail = payload.phoneTail;

    if (!phoneE164 || !phoneTail) {
      return res.status(500).json({
        success: false,
        message: "Missing phone data in token",
      });
    }

    // ----------- CHECK IF USER ALREADY EXISTS -----------
    const existing = await User.findOne({ phoneTail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Phone number already registered",
      });
    }

    // ----------- CREATE USER -----------
    const hashedPin = await bcrypt.hash(pin, 10);

    const newUser = new User({
      phoneFull: phoneE164,
      phoneTail,
      password: hashedPin,
      emailVerified: true,
    });

    await newUser.save();

    const { accessToken, refreshToken } = makeTokens(newUser._id);

    return res.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: newUser._id,
        phone: newUser.phoneFull,
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
   4) LOGIN
   POST /api/auth/login
====================================================== */
exports.loginUser = async (req, res) => {
  try {
    const { phone, pin } = req.body;

    const phoneE164 = normalizePhoneE164(phone);
    const tail = getPhoneTailFromE164(phoneE164);

    const user = await User.findOne({ phoneTail: tail });

    if (!user)
      return res.status(400).json({
        success: false,
        message: "Incorrect phone or PIN",
      });

    const match = await bcrypt.compare(pin, user.password);
    if (!match)
      return res.status(400).json({
        success: false,
        message: "Incorrect phone or PIN",
      });

    const tokens = makeTokens(user._id);

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        phone: user.phoneFull,
      },
      ...tokens,
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
====================================================== */
exports.resetPinComplete = async (req, res) => {
  try {
    const { token, pin, confirmPin } = req.body;

    if (!token || !pin || !confirmPin)
      return res.status(400).json({
        success: false,
        message: "Token + PIN required",
      });

    const payload = jwt.verify(token, process.env.JWT_SECRET);

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

    const user = await User.findById(payload.userId);
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
      message: "Failed to reset PIN",
    });
  }
};
