// src/controllers/profileController.js
const UserProfile = require("../models/UserProfile");
const { ok, error } = require("../utils/response");
const { buildPublicPath } = require("../services/fileService");

// Get own profile
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return error(res, "Unauthorized", 401);
    let profile = await UserProfile.findOne({ userId }).lean();
    if (!profile) {
      // return empty skeleton
      return ok(res, { profile: null });
    }
    // Convert file refs (if any) to path strings
    if (profile.profilePicture && profile.profilePicture.path) profile.profilePicture = profile.profilePicture.path;
    if (profile.idImage && profile.idImage.path) profile.idImage = profile.idImage.path;
    if (profile.passportImage && profile.passportImage.path) profile.passportImage = profile.passportImage.path;
    if (profile.traImage && profile.traImage.path) profile.traImage = profile.traImage.path;

    return ok(res, { profile });
  } catch (err) {
    console.error("getMyProfile:", err);
    return error(res, "Server error", 500);
  }
};

// Get profile by userId (public-safe raw profile; frontend decides what to show)
exports.getProfileByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await UserProfile.findOne({ userId }).lean();
    if (!profile) return error(res, "Profile not found", 404);

    // convert file refs to path strings
    if (profile.profilePicture && profile.profilePicture.path) profile.profilePicture = profile.profilePicture.path;
    if (profile.idImage && profile.idImage.path) profile.idImage = profile.idImage.path;
    if (profile.passportImage && profile.passportImage.path) profile.passportImage = profile.passportImage.path;
    if (profile.traImage && profile.traImage.path) profile.traImage = profile.traImage.path;

    return ok(res, { profile });
  } catch (err) {
    console.error("getProfileByUserId:", err);
    return error(res, "Server error", 500);
  }
};

// Create or update profile (FormData, supports files)
exports.createOrUpdateProfile = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return error(res, "Unauthorized", 401);

    // Pull text fields
    const {
      firstName,
      lastName,
      phoneNumber,
      age,
      languages, // expected comma separated or JSON array
      level,
      yearsOfExperience,
      levelOfEducation,
      freelancerOrEmployed,
      carOwnerOrDriver, // could come as CSV or array
      idNumber,
      passportNumber,
      traNumber,
      bio,
    } = req.body;

    // normalize multi-select fields
    let langArr = [];
    if (languages) {
      try {
        langArr = typeof languages === "string" && languages.startsWith("[") ? JSON.parse(languages) : languages.split ? languages.split(",").map(s=>s.trim()).filter(Boolean) : [];
      } catch (e) {
        langArr = (languages || "").split(",").map(s=>s.trim()).filter(Boolean);
      }
    }

    let ownerDriverArr = [];
    if (carOwnerOrDriver) {
      try {
        ownerDriverArr = typeof carOwnerOrDriver === "string" && carOwnerOrDriver.startsWith("[") ? JSON.parse(carOwnerOrDriver) : carOwnerOrDriver.split ? carOwnerOrDriver.split(",").map(s=>s.trim()).filter(Boolean) : [];
      } catch (e) {
        ownerDriverArr = (carOwnerOrDriver || "").split(",").map(s=>s.trim()).filter(Boolean);
      }
    }

    // Find or create
    let profile = await UserProfile.findOne({ userId });
    if (!profile) {
      profile = new UserProfile({ userId });
    }

    // update text/numbers
    if (firstName !== undefined) profile.firstName = firstName;
    if (lastName !== undefined) profile.lastName = lastName;
    if (phoneNumber !== undefined) profile.phoneNumber = phoneNumber;
    if (age !== undefined && age !== "") profile.age = Number(age);
    if (langArr.length) profile.languages = langArr;
    if (level !== undefined) profile.level = level;
    if (yearsOfExperience !== undefined && yearsOfExperience !== "") profile.yearsOfExperience = Number(yearsOfExperience);
    if (levelOfEducation !== undefined) profile.levelOfEducation = levelOfEducation;
    if (freelancerOrEmployed !== undefined) profile.freelancerOrEmployed = freelancerOrEmployed;
    if (ownerDriverArr.length) profile.carOwnerOrDriver = ownerDriverArr;
    if (idNumber !== undefined) profile.idNumber = idNumber;
    if (passportNumber !== undefined) profile.passportNumber = passportNumber;
    if (traNumber !== undefined) profile.traNumber = traNumber;
    if (bio !== undefined) profile.bio = bio;

    // files: expect these fields names in FormData:
    // profilePicture, idImage, passportImage, traImage
    if (req.files) {
      if (req.files.profilePicture && req.files.profilePicture[0]) {
        profile.profilePicture = { path: `uploads/users/${req.files.profilePicture[0].filename}` };
      }
      if (req.files.idImage && req.files.idImage[0]) {
        profile.idImage = { path: `uploads/users/${req.files.idImage[0].filename}` };
      }
      if (req.files.passportImage && req.files.passportImage[0]) {
        profile.passportImage = { path: `uploads/users/${req.files.passportImage[0].filename}` };
      }
      if (req.files.traImage && req.files.traImage[0]) {
        profile.traImage = { path: `uploads/users/${req.files.traImage[0].filename}` };
      }
    }

    profile.updatedAt = new Date();
    await profile.save();

    // return saved profile as paths
    const out = profile.toObject();
    if (out.profilePicture && out.profilePicture.path) out.profilePicture = out.profilePicture.path;
    if (out.idImage && out.idImage.path) out.idImage = out.idImage.path;
    if (out.passportImage && out.passportImage.path) out.passportImage = out.passportImage.path;
    if (out.traImage && out.traImage.path) out.traImage = out.traImage.path;

    return ok(res, { profile: out });
  } catch (err) {
    console.error("createOrUpdateProfile:", err);
    return error(res, "Server error", 500);
  }
};
