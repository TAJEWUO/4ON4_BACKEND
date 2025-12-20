// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const {
  startVerify,
  checkVerify,
  registerComplete,
  loginUser,
  resetPinComplete,
  refreshToken,
} = require("../controllers/authController");

// Twilio verification start
router.post("/verify/start", startVerify);

// Twilio verification check
router.post("/verify/check", checkVerify);

// Complete registration
router.post("/register-complete", registerComplete);

// Login
router.post("/login", loginUser);

// Reset PIN complete
router.post("/reset-pin-complete", resetPinComplete);

// Refresh token
router.post("/refresh", refreshToken);

module.exports = router;
