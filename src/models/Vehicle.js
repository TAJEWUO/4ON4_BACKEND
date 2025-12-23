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
    seatCount: { type: Number, default: 4, min: 4, max: 14 },
    tripType: { 
      type: String, 
      enum: ["LONG", "CROSS COUNTRY", "CITY", "BY ROAD", "PHOTOGRAPHY", ""], 
      default: "" 
    },
    color: { 
      type: String, 
      enum: ["GREEN", "BEIGE", "BROWN", "CREAM", "DARK GREEN", "LIGHT GREEN", ""], 
      default: "" 
    },
    windowType: { 
      type: String, 
      enum: ["GLASS", "CANVA", "BOTH", ""], 
      default: "GLASS" 
    },
    sunroof: { type: Boolean, default: false },
    fourByFour: { type: Boolean, default: false },
    additionalFeatures: { type: String, maxlength: 250 }, // ~50 words

    // images: 1-5 images
    images: [fileRefSchema],

    // documents (pdfs etc) - allow multiple
    documents: [fileRefSchema],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Vehicle || mongoose.model("Vehicle", vehicleSchema);
