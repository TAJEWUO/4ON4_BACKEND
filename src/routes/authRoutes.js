// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const {
  register,
  login,
  refreshToken,
} = require("../controllers/authController");

// Register new user
router.post("/register", register);

// Login
router.post("/login", login);

// Refresh access token (cookie-based)
router.post("/refresh", refreshToken);

module.exports = router;