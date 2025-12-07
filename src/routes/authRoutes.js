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

router.post("/verify/start", startVerify);
router.post("/verify/check", checkVerify);
router.post("/register-complete", registerComplete);
router.post("/login", loginUser);
router.post("/reset-pin-complete", resetPinComplete);

module.exports = router;
