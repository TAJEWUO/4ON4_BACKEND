// src/models/Vehicle.js
const mongoose = require("mongoose");

const fileRefSchema = new mongoose.Schema({
  path: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

const vehicleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    plateNumber: { type: String, required: true },
    model: { type: String, default: "" },
    seatCount: { type: Number, default: 4 }, // 4..14
    tripType: { type: String, enum: ["centralized", "by-road", "both", ""], default: "" },
    color: { type: String, default: "" },
    windowType: { type: String, enum: ["glass", "canvas", "both", ""], default: "glass" },
    sunroof: { type: Boolean, default: false },
    fourByFour: { type: Boolean, default: false },
    additionalFeatures: [{ type: String }], // e.g. wifi, cool box

    // images: up to 3
    images: [fileRefSchema],

    // documents (pdfs etc) - allow multiple
    documents: [fileRefSchema],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Vehicle || mongoose.model("Vehicle", vehicleSchema);
