// src/routes/userRoutes.js

const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const auth = require("../middleware/auth");

const userController = require("../controllers/userController");

const {
  register,
  login,
  resetPassword,
  getMe,
  updateProfile,
  getProfileById,
  updateProfileById,
} = userController;

// =======================
// AUTH ROUTES
// =======================

// Registration with phone/email + password + security answers
router.post("/register", register);

// Login with phone OR email + password
router.post("/login", login);

// Reset password using identifier + security answers
router.post("/reset-password", resetPassword);

// =======================
// AUTHENTICATED USER ROUTES
// =======================

// Get currently logged-in user's profile (uses auth middleware & JWT)
router.get("/me", auth, getMe);

// Update currently logged-in user's driver profile (uses auth & uploads)
router.put(
  "/profile",
  auth,
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "profileDocs", maxCount: 5 },
  ]),
  updateProfile
);

// =======================
// FRONTEND-MATCHING ROUTES (NO AUTH)
// These match what your 4ON4_CLIENT calls:
//   GET  /api/user/profile/:userId
//   PUT  /api/user/profile/:userId
// =======================

// Get user profile by ID (no auth; used by frontend dashboard)
router.get("/profile/:userId", getProfileById);

// Update user profile by ID (no auth; used by frontend dashboard)
router.put(
  "/profile/:userId",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "profileDocs", maxCount: 5 },
  ]),
  updateProfileById
);

module.exports = router;
