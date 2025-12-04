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

// 1) Start Twilio verification (register or reset)
router.post("/verify/start", startVerify);

// 2) Check Twilio verification code
router.post("/verify/check", checkVerify);

// 3) Finish registration (set PIN)
router.post("/register-complete", registerComplete);

// 4) Login with phone + PIN
router.post("/login", loginUser);

// 5) Finish reset PIN
router.post("/reset-pin-complete", resetPinComplete);

module.exports = router;
