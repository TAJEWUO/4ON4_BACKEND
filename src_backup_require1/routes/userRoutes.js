const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const auth = require("../middleware/auth");
const {
  register,
  login,
  resetPassword,
  getMe,
  updateProfile,
} = require("../controllers/userController");

// auth basics
router.post("/register", register);
router.post("/login", login);
router.post("/reset-password", resetPassword);

// driver profile
router.get("/me", auth, getMe);
router.put(
  "/profile",
  auth,
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "profileDocs", maxCount: 5 },
  ]),
  updateProfile
);

module.exports = router;
