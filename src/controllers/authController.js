const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

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

// Extract last 9 digits for phoneTail
function getPhoneTail(phoneE164) {
  return phoneE164.slice(-9);
}

// Generate access + refresh tokens
function makeTokens(userId) {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "2h" });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: "14d" });
  return { accessToken, refreshToken };
}

// Set refresh token as httpOnly cookie
function setRefreshCookie(res, refreshToken) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: 14 * 24 * 60 * 60 * 1000,
  };
  res.cookie("refreshToken", refreshToken, cookieOptions);
  console.log("[COOKIE] Setting refreshToken with options:", cookieOptions);
}

// Set access token as httpOnly cookie
function setAccessCookie(res, accessToken) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 2 * 60 * 60 * 1000,
  };
  res.cookie("accessToken", accessToken, cookieOptions);
  console.log("[COOKIE] Setting accessToken with options:", cookieOptions);
}

// ============================================================================
// 1. REGISTER NEW USER
// ============================================================================
exports.register = async (req, res) => {
  try {
    const { phone, pin } = req.body;
    
    if (!phone || !pin) {
      return res.status(400).json({ success: false, message: "Phone and PIN required" });
    }

    const phoneE164 = normalizePhone(phone);
    if (!phoneE164) {
      return res.status(400).json({ success: false, message: "Invalid phone number" });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ success: false, message: "PIN must be 4 digits" });
    }

    const phoneTail = getPhoneTail(phoneE164);

    // Check if user already exists
    const existing = await User.findOne({ phoneFull: phoneE164 });
    if (existing) {
      return res.status(400).json({ success: false, message: "Phone number already registered" });
    }

    // Create new user
    const hashedPin = await bcrypt.hash(pin, 10);
    const newUser = new User({
      phoneFull: phoneE164,
      phoneTail: phoneTail,
      password: hashedPin,
    });
    await newUser.save();

    // Generate tokens
    const { accessToken, refreshToken } = makeTokens(newUser._id);

    console.log("✓ User registered:", phoneE164);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token: accessToken,
      refreshToken: refreshToken,
      user: { 
        id: newUser._id, 
        phone: newUser.phoneFull
      },
    });

  } catch (err) {
    console.error("✗ register error:", err.message);
    return res.status(500).json({ success: false, message: "Registration failed" });
  }
};

// ============================================================================
// 2. LOGIN
// ============================================================================
exports.login = async (req, res) => {
  try {
    const { phone, pin } = req.body;
    
    if (!phone || !pin) {
      return res.status(400).json({ success: false, message: "Phone and PIN required" });
    }

    const phoneE164 = normalizePhone(phone);
    if (!phoneE164) {
      return res.status(400).json({ success: false, message: "Invalid phone number" });
    }

    // Find user by phoneFull
    const user = await User.findOne({ phoneFull: phoneE164 });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Verify PIN
    const validPin = await bcrypt.compare(pin, user.password);
    if (!validPin) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Generate tokens
    const { accessToken, refreshToken } = makeTokens(user._id);

    console.log("✓ User logged in:", phoneE164);

    return res.json({
      success: true,
      message: "Login successful",
      token: accessToken,
      refreshToken: refreshToken,
      user: { 
        id: user._id, 
        phone: user.phoneFull
      },
    });

  } catch (err) {
    console.error("✗ login error:", err.message);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};

// ============================================================================
// 3. REFRESH TOKEN
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
