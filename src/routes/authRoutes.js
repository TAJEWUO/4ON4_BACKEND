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

// 2) Registration: token + phone + PIN
router.post("/register-complete", registerComplete);

// 3) Login
router.post("/login", loginUser);

// 4) Reset PIN start
router.post("/reset-start", resetPasswordStart);

// 5) Reset PIN complete
router.post("/reset-complete", resetPasswordComplete);

module.exports = router;
