const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { uploadUser } = require("../middleware/upload");
const profileController = require("../controllers/profileController");

// GET own profile
router.get("/me", auth, profileController.getMyProfile);

// CREATE profile (first time)
router.post(
  "/",
  auth,
  uploadUser.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "idImage", maxCount: 1 },
    { name: "passportImage", maxCount: 1 },
    { name: "traImage", maxCount: 1 },
  ]),
  profileController.createProfile
);

// UPDATE profile
router.put(
  "/me",
  auth,
  uploadUser.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "idImage", maxCount: 1 },
    { name: "passportImage", maxCount: 1 },
    { name: "traImage", maxCount: 1 },
  ]),
  profileController.updateProfile
);

// UPDATE PROFILE AVATAR ONLY
router.post(
  "/me/avatar",
  auth,
  uploadUser.single("profilePicture"),
  profileController.updateProfileAvatar
);

module.exports = router;
