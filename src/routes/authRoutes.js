// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const {
  registerStart,
  registerComplete,
  loginUser,
  resetPasswordStart,
  resetPasswordComplete,
} = require("../controllers/authController");

// 1) Registration: email -> send verify link
router.post("/register-start", registerStart);

// 2) Registration: after clicking email link -> set phone + password
router.post("/register-complete", registerComplete);

// 3) Login: phone (or email) + password
router.post("/login", loginUser);

// 4) Reset password: start by email
router.post("/reset-start", resetPasswordStart);

// 5) Reset password: finish with token + new password
router.post("/reset-complete", resetPasswordComplete);

module.exports = router;
