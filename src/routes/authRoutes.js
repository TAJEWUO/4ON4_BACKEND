// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const {
  registerStart,
  verifyEmailCode,
  registerComplete,
  loginUser,
  resetPasswordStart,
  resetPasswordComplete,
} = require("../controllers/authController");

// ============================
// AUTH ROUTES (FINAL)
// ============================

// 1) Register → send OTP
router.post("/register-start", registerStart);

// 2) Register → verify OTP
router.post("/verify-email-code", verifyEmailCode);

// 3) Register → complete registration
router.post("/register-complete", registerComplete);

// 4) Login
router.post("/login", loginUser);

// 5) Reset PIN → start
router.post("/reset-start", resetPasswordStart);

// 6) Reset PIN → complete
router.post("/reset-complete", resetPasswordComplete);

module.exports = router;
