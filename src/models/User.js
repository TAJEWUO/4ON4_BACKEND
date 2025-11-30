// src/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true },
    emailVerified: { type: Boolean, default: false },

    // Phone stored as 07xxxxxxxx or 01xxxxxxxx
    phone: { type: String, unique: true, sparse: true },

    // Optional alias reused from old code
    identifier: { type: String },

    // 4-digit PIN stored as plain string (NOT secure)
    password: { type: String },

    // Email verification
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    // ⭐ NEW: 6-digit OTP code + expiry
    emailVerificationCode: String,
    emailVerificationCodeExpires: Date,


    // Reset PIN
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
