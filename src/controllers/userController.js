// src/controllers/userController.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// helper to normalize security answers (trim + lowercase)
function norm(str = "") {
  return str.trim().toLowerCase();
}

// =======================
// REGISTER
// =======================
exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      password,
      confirmPassword,
      answer1,
      answer2,
      answer3,
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (!phone && !email) {
      return res
        .status(400)
        .json({ message: "Provide phone or email for login" });
    }

    if (!password || password !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "Password and confirm must match" });
    }

    // check unique phone/email
    if (phone) {
      const existsPhone = await User.findOne({ phone });
      if (existsPhone) {
        return res.status(400).json({ message: "Phone already registered" });
      }
    }
    if (email) {
      const existsEmail = await User.findOne({ email });
      if (existsEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      phone: phone || null,
      email: email || null,
      password: hashed,
      securityAnswers: {
        answer1: norm(answer1),
        answer2: norm(answer2),
        answer3: norm(answer3),
      },
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("REGISTER error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =======================
// LOGIN
// =======================
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // phone OR email

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Identifier and password required" });
    }

    const user = await User.findOne({
      $or: [{ phone: identifier }, { email: identifier }],
    });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Wrong password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("LOGIN error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =======================
// RESET PASSWORD
// =======================
exports.resetPassword = async (req, res) => {
  try {
    const { identifier, answer1, answer2, answer3, newPassword } = req.body;

    if (!identifier || !newPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOne({
      $or: [{ phone: identifier }, { email: identifier }],
    });

    if (!user) {
      return res.status(400).json({ message: "User not found for reset" });
    }

    const s = user.securityAnswers;
    if (
      norm(answer1) !== s.answer1 ||
      norm(answer2) !== s.answer2 ||
      norm(answer3) !== s.answer3
    ) {
      return res
        .status(400)
        .json({ message: "Security answers do not match" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("RESET PASSWORD error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =======================
// GET CURRENT USER (AUTH)
// =======================
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -securityAnswers"
    );
    res.json(user);
  } catch (err) {
    console.error("GET ME error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =======================
// UPDATE PROFILE (AUTH)
// =======================
exports.updateProfile = async (req, res) => {
  try {
    const {
      citizenship,
      level,
      licenseNumber,
      nationalId,
      languages,
      contactPhone,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.citizenship = citizenship || user.citizenship;
    user.level = level || user.level;
    user.licenseNumber = licenseNumber || user.licenseNumber;
    user.nationalId = nationalId || user.nationalId;

    if (languages) {
      try {
        user.languages = Array.isArray(languages)
          ? languages
          : JSON.parse(languages);
      } catch {
        user.languages = [languages];
      }
    }

    // profile image
    if (req.files && req.files.profileImage && req.files.profileImage[0]) {
      user.profileImage = req.files.profileImage[0].path;
    }

    // profile docs
    if (req.files && req.files.profileDocs) {
      const docs = req.files.profileDocs.map((f) => f.path);
      user.profileDocuments = [...(user.profileDocuments || []), ...docs];
    }

    // contact phone (separate from login phone)
    if (contactPhone) {
      user.contactPhone = contactPhone;
    }

    await user.save();
    res.json({ message: "Profile updated", user });
  } catch (err) {
    console.error("UPDATE PROFILE (auth) error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =======================
// GET PROFILE BY ID (NO AUTH)
// used by frontend: GET /api/user/profile/:userId
// =======================
exports.getProfileById = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId).select(
      "-password -securityAnswers"
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error("getProfileById error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =======================
// UPDATE PROFILE BY ID (NO AUTH)
// used by frontend: PUT /api/user/profile/:userId
// =======================
exports.updateProfileById = async (req, res) => {
  try {
    const userId = req.params.userId;

    let updates = { ...req.body };

    // Parse languages if passed as JSON string
    if (updates.languages) {
      try {
        updates.languages = JSON.parse(updates.languages);
      } catch {
        updates.languages = [updates.languages];
      }
    }

    // profile image file
    if (req.files?.profileImage?.[0]) {
      updates.profileImage = req.files.profileImage[0].path;
    }

    // profile docs files
    if (req.files?.profileDocs) {
      updates.profileDocuments = req.files.profileDocs.map((f) => f.path);
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    }).select("-password -securityAnswers");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error("updateProfileById error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
