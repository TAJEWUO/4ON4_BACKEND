// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const {
  startVerify,
  checkVerify,
  registerComplete,
  loginUser,
  resetPinComplete,
} = require("../controllers/authController");

// 1) Start Twilio SMS verification
router.post("/verify/start", startVerify);

// 2) Check OTP code
router.post("/verify/check", checkVerify);

// 3) Complete registration (set PIN)
router.post("/register-complete", registerComplete);

// 4) Login
router.post("/login", loginUser);

// 5) Complete PIN reset after OTP
router.post("/reset-pin-complete", resetPinComplete);

module.exports = router;
