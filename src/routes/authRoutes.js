// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const {
  registerStart,
  verifyEmailCode,   // ⭐ NEW
  registerComplete,
  loginUser,
  resetPasswordStart,
  resetPasswordComplete,
} = require("../controllers/authController");

// 1) Registration: email -> send 6-digit code
router.post("/register-start", registerStart);

// 2) Verify 6-digit email code
router.post("/verify-email-code", verifyEmailCode);

// 3) Registration complete: phone + PIN + token
router.post("/register-complete", registerComplete);

// 4) Login: phone (or email) + PIN
router.post("/login", loginUser);

// 5) Reset password: start by email
router.post("/reset-start", resetPasswordStart);

// 6) Reset password: finish with token + new password
router.post("/reset-complete", resetPasswordComplete);

module.exports = router;
