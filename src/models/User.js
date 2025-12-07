// src/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Full phone in E.164 format, e.g. +2547xxxxxxx
    phoneFull: { type: String, required: true, unique: true, trim: true },

    // Last 9 digits (tail) for quick lookups and uniqueness
    phoneTail: { type: String, required: true, index: true },

    // Hashed PIN/password (bcrypt)
    password: { type: String, required: true },

    // Optional profile reference (if you want to keep profile in a separate collection)
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "UserProfile", default: null },

    // Role, flags, metadata
    role: { type: String, default: "driver" },
    isActive: { type: Boolean, default: true },

    // Refresh tokens or token metadata may be kept elsewhere
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// simple index on phoneTail for faster lookup
userSchema.index({ phoneTail: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
