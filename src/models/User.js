const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // ────────────────────────────────
    // EMAIL (optional now)
    // ────────────────────────────────
    email: {
      type: String,
      required: false, // ← FIXED: email verification removed
      trim: true,
      lowercase: true,
    },

    // ────────────────────────────────
    // PHONE (required)
    // ────────────────────────────────
    phoneFull: {
      type: String,
      required: true, // e.g. "+254712345678"
    },

    phoneTail: {
      type: String,
      required: true, // last 9 digits for quick lookup
      index: true,
      unique: true,
    },

    // ────────────────────────────────
    // AUTH
    // ────────────────────────────────
    password: {
      type: String, // hashed PIN
      required: true,
    },

    // these remain to support legacy fields safely
    emailVerified: {
      type: Boolean,
      default: true,
    },

    emailVerificationCode: String,
    emailVerificationCodeExpires: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
