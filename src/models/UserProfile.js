// src/models/UserProfile.js
const mongoose = require("mongoose");

const fileRefSchema = new mongoose.Schema({
  path: { type: String }, // e.g. uploads/users/abc.jpg
  uploadedAt: { type: Date, default: Date.now },
});

const userProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    // Basic info
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    phoneNumber: { type: String, default: "" }, // usually from auth
    age: { type: Number },
    languages: [{ type: String }], // multiple languages allowed
    level: { type: String, enum: ["gold", "silver", "bronze", ""], default: "" },
    yearsOfExperience: { type: Number },
    levelOfEducation: { type: String, default: "" },
    freelancerOrEmployed: { type: String, enum: ["freelancer", "employed", ""] },
    carOwnerOrDriver: [{ type: String, enum: ["owner", "driver"] }], // can select both

    // Identifiers & documents
    idNumber: { type: String, default: "" },
    idImage: fileRefSchema, // e.g. uploads/users/id-xxx.jpg

    passportNumber: { type: String, default: "" },
    passportImage: fileRefSchema,

    traNumber: { type: String, default: "" },
    traImage: fileRefSchema,

    // Profile picture
    profilePicture: fileRefSchema,

    // Misc / free text
    bio: { type: String, default: "" },

    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.models.UserProfile || mongoose.model("UserProfile", userProfileSchema);
