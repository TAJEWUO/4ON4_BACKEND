const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const twilio = require("twilio");

// Twilio setup
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SID = process.env.TWILIO_VERIFY_SID;

let twilioClient = null;
const IS_DEV = process.env.NODE_ENV !== "production";
const DEV_BYPASS = process.env.DEV_BYPASS === "true"; // Skip all auth checks

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SID) {
  console.warn("⚠️  Twilio not configured - using dev mode");
} else {
  try {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log("✓ Twilio client initialized");
  } catch (err) {
    console.error("✗ Twilio init failed:", err.message);
  }
}

// Normalize phone to E.164 format (+254...)
function normalizePhone(phone) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  let local = digits;
  if (digits.startsWith("254")) local = digits.slice(3);
  else if (digits.startsWith("0")) local = digits.slice(1);
  const tail9 = local.slice(-9);
  if (tail9.length !== 9) return "";
  return "+254" + tail9;
}

// Generate access + refresh tokens
function makeTokens(userId) {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "2h" });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: "14d" });
  return { accessToken, refreshToken };
}

// Set refresh token as httpOnly cookie
function setRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: 14 * 24 * 60 * 60 * 1000,
  });
}

// ============================================================================
// 1. START VERIFICATION (Send OTP)
// ============================================================================
exports.startVerify = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: "Phone required" });

    const phoneE164 = normalizePhone(phone);
    if (!phoneE164) return res.status(400).json({ success: false, message: "Invalid phone number" });

    // DEV BYPASS: Skip everything, instant success
    if (DEV_BYPASS) {
      console.log("🚀 DEV_BYPASS: Auto-approving OTP for", phoneE164);
      return res.json({ success: true, message: "OTP bypassed (dev mode)" });
    }

    // DEV MODE: Skip Twilio, return success immediately
    if (!twilioClient && IS_DEV) {
      console.log("📱 DEV: Simulating OTP send to", phoneE164);
      return res.json({ success: true, message: "OTP sent (dev mode)" });
    }

    // PRODUCTION: Use Twilio
    if (!twilioClient) {
      return res.status(500).json({ success: false, message: "SMS service unavailable" });
    }

    await twilioClient.verify.v2.services(TWILIO_VERIFY_SID).verifications.create({ 
      to: phoneE164, 
      channel: "sms" 
    });

    console.log("✓ OTP sent to", phoneE164);
    return res.json({ success: true, message: "OTP sent" });

  } catch (err) {
    console.error("✗ startVerify error:", err.message);
    
    // Fallback for Twilio errors in dev
    if (err.code === 20003 && IS_DEV) {
      console.log("📱 DEV: Twilio auth failed, using fallback");
      return res.json({ success: true, message: "OTP sent (dev fallback)" });
    }
    
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

// ============================================================================
// 2. CHECK VERIFICATION (Verify OTP)
// ============================================================================
exports.checkVerify = async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ success: false, message: "Phone and code required" });

    const phoneE164 = normalizePhone(phone);
    if (!phoneE164) return res.status(400).json({ success: false, message: "Invalid phone number" });

    // DEV BYPASS: Accept any code instantly
    if (DEV_BYPASS) {
      console.log("🚀 DEV_BYPASS: Auto-accepting code for", phoneE164);
      return res.json({ success: true, message: "OTP bypassed (dev mode)" });
    }

    // DEV MODE: Accept any 4-6 digit code
    if (!twilioClient && IS_DEV) {
      if (!/^\d{4,6}$/.test(code)) {
        return res.status(400).json({ success: false, message: "Invalid code format" });
      }
      console.log("✓ DEV: OTP verified for", phoneE164);
      return res.json({ success: true, message: "OTP verified (dev mode)" });
    }

    // PRODUCTION: Verify with Twilio
    if (!twilioClient) {
      return res.status(500).json({ success: false, message: "SMS service unavailable" });
    }

    const check = await twilioClient.verify.v2.services(TWILIO_VERIFY_SID)
      .verificationChecks.create({ to: phoneE164, code });

    if (check.status !== "approved") {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }

    console.log("✓ OTP verified for", phoneE164);
    return res.json({ success: true, message: "OTP verified" });

  } catch (err) {
    console.error("✗ checkVerify error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to verify OTP" });
  }
};

// ============================================================================
// 3. COMPLETE REGISTRATION
// ============================================================================
exports.registerComplete = async (req, res) => {
  try {
    const { phone, pin, firstName, lastName } = req.body;
    
    if (!phone || !pin || !firstName || !lastName) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const phoneE164 = normalizePhone(phone);
    if (!phoneE164) {
      return res.status(400).json({ success: false, message: "Invalid phone number" });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ success: false, message: "PIN must be 4 digits" });
    }

    // DEV BYPASS: Auto-login if user exists, or create new user
    if (DEV_BYPASS) {
      console.log("🚀 DEV_BYPASS: Auto-registering/logging in", phoneE164);
      
      let user = await User.findOne({ phone: phoneE164 });
      if (user) {
        // User exists - just log them in
        const { accessToken, refreshToken } = makeTokens(user._id);
        setRefreshCookie(res, refreshToken);
        return res.status(200).json({
          success: true,
          message: "Auto-login (user exists)",
          accessToken,
          user: { id: user._id, phone: user.phone, firstName: user.firstName, lastName: user.lastName },
        });
      }
      // Continue to create new user below
    }

    // Check if user already exists
    const existing = await User.findOne({ phone: phoneE164 });
    if (existing) {
      return res.status(400).json({ success: false, message: "Phone number already registered" });
    }

    // Create new user
    const hashedPin = await bcrypt.hash(pin, 10);
    const newUser = new User({
      phone: phoneE164,
      pin: hashedPin,
      firstName,
      lastName,
    });
    await newUser.save();

    // Generate tokens
    const { accessToken, refreshToken } = makeTokens(newUser._id);
    setRefreshCookie(res, refreshToken);

    console.log("✓ User registered:", phoneE164);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      accessToken,
      user: { 
        id: newUser._id, 
        phone: newUser.phone, 
        firstName: newUser.firstName, 
        lastName: newUser.lastName 
      },
    });

  } catch (err) {
    console.error("✗ registerComplete error:", err.message);
    return res.status(500).json({ success: false, message: "Registration failed" });
  }
};

// ============================================================================
// 4. LOGIN
// ============================================================================
exports.loginUser = async (req, res) => {
  try {
    const { phone, pin } = req.body;
    
    if (!phone || !pin) {
      return res.status(400).json({ success: false, message: "Phone and PIN required" });
    }

    const phoneE164 = normalizePhone(phone);
    if (!phoneE164) {
      return res.status(400).json({ success: false, message: "Invalid phone number" });
    }

    // DEV BYPASS: Auto-create user if doesn't exist, always login
    if (DEV_BYPASS) {
      console.log("🚀 DEV_BYPASS: Auto-login for", phoneE164);
      
      let user = await User.findOne({ phone: phoneE164 });
      if (!user) {
        // Create user on the fly
        const hashedPin = await bcrypt.hash(pin, 10);
        user = new User({
          phone: phoneE164,
          pin: hashedPin,
          firstName: "Dev",
          lastName: "User",
        });
        await user.save();
        console.log("🚀 DEV_BYPASS: Created new user", phoneE164);
      }
      
      const { accessToken, refreshToken } = makeTokens(user._id);
      setRefreshCookie(res, refreshToken);
      return res.json({
        success: true,
        message: "Auto-login (dev bypass)",
        accessToken,
        user: { id: user._id, phone: user.phone, firstName: user.firstName, lastName: user.lastName },
      });
    }

    // Find user
    const user = await User.findOne({ phone: phoneE164 });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Verify PIN
    const validPin = await bcrypt.compare(pin, user.pin);
    if (!validPin) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Generate tokens
    const { accessToken, refreshToken } = makeTokens(user._id);
    setRefreshCookie(res, refreshToken);

    console.log("✓ User logged in:", phoneE164);

    return res.json({
      success: true,
      message: "Login successful",
      accessToken,
      user: { 
        id: user._id, 
        phone: user.phone, 
        firstName: user.firstName, 
        lastName: user.lastName 
      },
    });

  } catch (err) {
    console.error("✗ loginUser error:", err.message);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};

// ============================================================================
// 5. RESET PIN
// ============================================================================
exports.resetPinComplete = async (req, res) => {
  try {
    const { phone, newPin } = req.body;
    
    if (!phone || !newPin) {
      return res.status(400).json({ success: false, message: "Phone and new PIN required" });
    }

    const phoneE164 = normalizePhone(phone);
    if (!phoneE164) {
      return res.status(400).json({ success: false, message: "Invalid phone number" });
    }

    if (!/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ success: false, message: "PIN must be 4 digits" });
    }

    // Find user
    const user = await User.findOne({ phone: phoneE164 });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update PIN
    const hashedPin = await bcrypt.hash(newPin, 10);
    user.pin = hashedPin;
    await user.save();

    console.log("✓ PIN reset for:", phoneE164);

    return res.json({ success: true, message: "PIN reset successful" });

  } catch (err) {
    console.error("✗ resetPinComplete error:", err.message);
    return res.status(500).json({ success: false, message: "PIN reset failed" });
  }
};

// ============================================================================
// 6. REFRESH TOKEN
// ============================================================================
exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    
    if (!token) {
      return res.status(401).json({ success: false, message: "No refresh token" });
    }

    // Verify refresh token
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = makeTokens(user._id);
    setRefreshCookie(res, newRefreshToken);

    return res.json({ success: true, accessToken });

  } catch (err) {
    console.error("✗ refreshToken error:", err.message);
    return res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
};
