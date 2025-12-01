const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },

    // New phone structure
    phoneFull: { type: String, unique: true, sparse: true }, 
    phoneTail: { type: String, index: true }, // last 8 digits for login matching

    password: String, // hashed 4-digit PIN

    emailVerified: { type: Boolean, default: false },

    emailVerificationCode: String,
    emailVerificationCodeExpires: Date,

    emailVerificationToken: String,
    emailVerificationExpires: Date,

    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
