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

// TWILIO PHONE VERIFICATION
router.post("/verify/start", startVerify);
router.post("/verify/check", checkVerify);

// FINISH REGISTRATION
router.post("/register-complete", registerComplete);

// LOGIN
router.post("/login", loginUser);

// RESET PIN
router.post("/reset-pin-complete", resetPinComplete);

module.exports = router;
