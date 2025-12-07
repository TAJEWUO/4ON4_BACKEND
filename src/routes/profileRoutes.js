// src/routes/profileRoutes.js
const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const auth = require("../middleware/auth");
const { uploadUser } = require("../middleware/upload");

// create or update profile (authenticated). Expect FormData with optional files:
// profilePicture, idImage, passportImage, traImage
router.post(
  "/update",
  auth,
  uploadUser.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "idImage", maxCount: 1 },
    { name: "passportImage", maxCount: 1 },
    { name: "traImage", maxCount: 1 },
  ]),
  profileController.createOrUpdateProfile
);

router.get("/me", auth, profileController.getMyProfile);
router.get("/:userId", auth, profileController.getProfileByUserId);

module.exports = router;
