// src/models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  // Phone is the main username for login
  phone: { type: String, unique: true, sparse: true },

  // Email used for verification + password reset
  email: { type: String, unique: true, sparse: true },

  // Keep identifier for backward compatibility (we will store phone in it)
  identifier: { type: String, unique: true, sparse: true },

  // Hashed password
  password: { type: String },

  // Email verification
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,

  // Password reset
  resetPasswordToken: String,
  resetPasswordExpires: Date,

  // Driver profile details (existing fields)
  firstName: String,
  lastName: String,
  citizenship: String,
  level: String,
  licenseNumber: String,
  nationalId: String,
  languages: [String],
  profileImage: String,
  profileDocuments: [String],

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);
