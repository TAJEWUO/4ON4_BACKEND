// src/controllers/publicController.js

const Vehicle = require("../models/Vehicle");
const User = require("../models/user");

// PUBLIC: list all vehicles with SAFE driver data only
exports.getPublicVehicles = async (req, res) => {
  try {
    // You can later add query params like ?page=&limit=, but for now we return all
    const vehicles = await Vehicle.find()
      .sort({ createdAt: -1 })
      .populate("driverId", [
        "firstName",
        "citizenship",
        "level",
        "languages",
        "profileImage",
      ]);

    // Shape matches what frontend will expect
    return res.json({
      success: true,
      vehicles,
    });
  } catch (err) {
    console.error("getPublicVehicles error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
