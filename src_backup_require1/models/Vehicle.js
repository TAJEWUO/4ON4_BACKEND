const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  plateNumber: { type: String, required: true, unique: true },
  capacity: { type: Number, required: true },
  windowType: { type: String, required: true },
  model: { type: String },

  images: [String], // /uploads/vehicles/xxx.jpg

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Vehicle", VehicleSchema);
