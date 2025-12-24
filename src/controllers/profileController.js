const UserProfile = require("../models/UserProfile");
const { ok, error } = require("../utils/response");
const { convertToWebP } = require("../utils/imageConverter");

/* ───────────────────────────────────────────────
   GET MY PROFILE
   GET /profile/me
─────────────────────────────────────────────── */
exports.getMyProfile = async (req, res) => {
  console.log("\n[GET MY PROFILE] --- START ---");
  try {
    const userId = req.user?.id;
    console.log("[GET MY PROFILE] User ID from req.user:", userId);
    
    if (!userId) {
      console.log("[GET MY PROFILE] ❌ No userId in req.user");
      return error(res, "Unauthorized", 401);
    }

    console.log("[GET MY PROFILE] Querying MongoDB for userId:", userId);
    const profile = await UserProfile.findOne({ userId }).lean();
    console.log("[GET MY PROFILE] Query result:", profile ? "FOUND" : "NOT FOUND");
    
    if (profile) {
      console.log("[GET MY PROFILE] Profile data:", {
        _id: profile._id,
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        hasEmail: !!profile.email
      });
    }

    if (!profile) {
      console.log("[GET MY PROFILE] ✅ Returning null profile (user has no profile yet)");
      return ok(res, { profile: null });
    }

    const serialized = serialize(profile);
    console.log("[GET MY PROFILE] ✅ Returning profile, keys:", Object.keys(serialized));
    console.log("[GET MY PROFILE] --- END (SUCCESS) ---\n");
    return ok(res, { profile: serialized });
  } catch (err) {
    console.error("[GET MY PROFILE] ❌ ERROR:", err);
    console.log("[GET MY PROFILE] --- END (ERROR) ---\n");
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

    await applyProfileFields(profile, req);
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

    await applyProfileFields(profile, req);
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
      profilePicture: {
        path: profile.profilePicture.path,
      },
    });
  } catch (err) {
    console.error("updateProfileAvatar:", err);
    return error(res, "Server error", 500);
  }
};

/* ───────────────────────────────────────────────
   INTERNAL HELPERS
─────────────────────────────────────────────── */

async function applyProfileFields(profile, req) {
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
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(languages);
        if (Array.isArray(parsed)) {
          profile.languages = parsed;
        } else {
          // Fall back to comma-separated
          profile.languages = languages
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean);
        }
      } catch {
        // If JSON parse fails, treat as comma-separated
        profile.languages = languages
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean);
      }
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
      const webpPath = await convertToWebP(req.files.profilePicture[0].path);
      const relativePath = webpPath.replace(/\\/g, '/').split('uploads/')[1];
      profile.profilePicture = {
        path: `uploads/${relativePath}`,
      };
    }
    if (req.files.idImage?.[0]) {
      const webpPath = await convertToWebP(req.files.idImage[0].path);
      const relativePath = webpPath.replace(/\\/g, '/').split('uploads/')[1];
      profile.idImage = {
        path: `uploads/${relativePath}`,
      };
    }
    if (req.files.passportImage?.[0]) {
      const webpPath = await convertToWebP(req.files.passportImage[0].path);
      const relativePath = webpPath.replace(/\\/g, '/').split('uploads/')[1];
      profile.passportImage = {
        path: `uploads/${relativePath}`,
      };
    }
    if (req.files.traImage?.[0]) {
      const webpPath = await convertToWebP(req.files.traImage[0].path);
      const relativePath = webpPath.replace(/\\/g, '/').split('uploads/')[1];
      profile.traImage = {
        path: `uploads/${relativePath}`,
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
