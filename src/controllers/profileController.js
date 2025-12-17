const UserProfile = require("../models/UserProfile");
const { ok, error } = require("../utils/response");

/* ───────────────────────────────────────────────
   GET MY PROFILE
   GET /profile/me
─────────────────────────────────────────────── */
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return error(res, "Unauthorized", 401);

    const profile = await UserProfile.findOne({ userId }).lean();

    if (!profile) {
      return ok(res, { profile: null });
    }

    return ok(res, { profile: serialize(profile) });
  } catch (err) {
    console.error("getMyProfile:", err);
    return error(res, "Server error", 500);
  }
};

/* ───────────────────────────────────────────────
   CREATE PROFILE (FIRST TIME)
   POST /profile
─────────────────────────────────────────────── */
exports.createProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return error(res, "Unauthorized", 401);

    const exists = await UserProfile.findOne({ userId });
    if (exists) {
      return error(res, "Profile already exists", 409);
    }

    const profile = new UserProfile({ userId });

    applyProfileFields(profile, req);
    await profile.save();

    return ok(res, { profile: serialize(profile.toObject()) });
  } catch (err) {
    console.error("createProfile:", err);
    return error(res, "Server error", 500);
  }
};

/* ───────────────────────────────────────────────
   UPDATE PROFILE
   PUT /profile/me
─────────────────────────────────────────────── */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return error(res, "Unauthorized", 401);

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return error(res, "Profile not found", 404);
    }

    applyProfileFields(profile, req);
    await profile.save();

    return ok(res, { profile: serialize(profile.toObject()) });
  } catch (err) {
    console.error("updateProfile:", err);
    return error(res, "Server error", 500);
  }
};

/* ───────────────────────────────────────────────
   UPDATE PROFILE AVATAR ONLY
   POST /profile/me/avatar
─────────────────────────────────────────────── */
exports.updateProfileAvatar = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return error(res, "Unauthorized", 401);

    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      return error(res, "Profile not found", 404);
    }

    if (!req.file) {
      return error(res, "No image uploaded", 400);
    }

    profile.profilePicture = {
      path: `uploads/users/${req.file.filename}`,
    };
    profile.updatedAt = new Date();
    await profile.save();

    return ok(res, {
      profilePicture: profile.profilePicture.path,
    });
  } catch (err) {
    console.error("updateProfileAvatar:", err);
    return error(res, "Server error", 500);
  }
};

/* ───────────────────────────────────────────────
   INTERNAL HELPERS
─────────────────────────────────────────────── */

function applyProfileFields(profile, req) {
  const {
    firstName,
    lastName,
    otherName,
    phoneNumber,
    email,
    languages,
    level,
    levelOfEducation,
    idNumber,
    passportNumber,
    drivingLicenseNumber,
    traNumber,
    yearsOfExperience,
    bio,
  } = req.body;

  if (firstName !== undefined) profile.firstName = firstName;
  if (lastName !== undefined) profile.lastName = lastName;
  if (otherName !== undefined) profile.otherName = otherName;
  if (phoneNumber !== undefined) profile.phoneNumber = phoneNumber;
  if (email !== undefined) profile.email = email;

  if (languages !== undefined) {
    if (Array.isArray(languages)) {
      profile.languages = languages;
    } else if (typeof languages === "string") {
      profile.languages = languages
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);
    }
  }

  if (level !== undefined) profile.level = level;
  if (levelOfEducation !== undefined)
    profile.levelOfEducation = levelOfEducation;

  if (idNumber !== undefined) profile.idNumber = idNumber;
  if (passportNumber !== undefined) profile.passportNumber = passportNumber;
  if (drivingLicenseNumber !== undefined)
    profile.drivingLicenseNumber = drivingLicenseNumber;
  if (traNumber !== undefined) profile.traNumber = traNumber;

  if (yearsOfExperience !== undefined && yearsOfExperience !== "") {
    profile.yearsOfExperience = Number(yearsOfExperience);
  }

  if (bio !== undefined) profile.bio = bio;

  if (req.files) {
    if (req.files.profilePicture?.[0]) {
      profile.profilePicture = {
        path: `uploads/users/${req.files.profilePicture[0].filename}`,
      };
    }
    if (req.files.idImage?.[0]) {
      profile.idImage = {
        path: `uploads/users/${req.files.idImage[0].filename}`,
      };
    }
    if (req.files.passportImage?.[0]) {
      profile.passportImage = {
        path: `uploads/users/${req.files.passportImage[0].filename}`,
      };
    }
    if (req.files.traImage?.[0]) {
      profile.traImage = {
        path: `uploads/users/${req.files.traImage[0].filename}`,
      };
    }
  }

  profile.updatedAt = new Date();
}

function serialize(profile) {
  if (profile.profilePicture?.path)
    profile.profilePicture = profile.profilePicture.path;
  if (profile.idImage?.path) profile.idImage = profile.idImage.path;
  if (profile.passportImage?.path)
    profile.passportImage = profile.passportImage.path;
  if (profile.traImage?.path) profile.traImage = profile.traImage.path;
  return profile;
}
