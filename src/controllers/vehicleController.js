const Vehicle = require("../models/Vehicle");
const User = require("../models/user");

/**
 * Clean uploaded file paths so they work on Windows, Linux and Next.js
 */
function cleanFilePath(path) {
  return path
    .replace(/\\/g, "/")      // Fix Windows backslashes
    .replace(/^src\//, "");    // Remove leading src/ if exists
}

/**
 * ADD VEHICLE (JWT REQUIRED)
 * Uploads up to 3 images
 */
exports.addVehicle = async (req, res) => {
  try {
    const { plateNumber, capacity, windowType, model } = req.body;

    if (!plateNumber || !capacity || !windowType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Clean uploaded image paths
    const images = (req.files || []).map((file) => cleanFilePath(file.path));

    const vehicle = await Vehicle.create({
      driverId: req.user.id,
      plateNumber,
      capacity,
      windowType,
      model,
      images,
    });

    return res.json({ success: true, vehicle });
  } catch (err) {
    console.error("addVehicle error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ADD VEHICLE — DEV MODE (NO JWT)
 */
exports.addVehicleFromBodyUserId = async (req, res) => {
  try {
    const { userId, plateNumber, capacity, windowType, model } = req.body;

    if (!userId || !plateNumber || !capacity || !windowType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Clean uploaded image paths
    const images = (req.files || []).map((file) => cleanFilePath(file.path));

    const vehicle = await Vehicle.create({
      driverId: userId,
      plateNumber,
      capacity,
      windowType,
      model,
      images,
    });

    return res.json({ success: true, vehicle });
  } catch (err) {
    console.error("addVehicleFromBodyUserId error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * GET VEHICLES FOR LOGGED-IN DRIVER
 */
exports.getMyVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ driverId: req.user.id }).sort({
      createdAt: -1,
    });

    return res.json({ success: true, vehicles });
  } catch (err) {
    console.error("getMyVehicles error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET VEHICLES BY USER ID
 */
exports.getVehiclesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId param",
      });
    }

    const vehicles = await Vehicle.find({ driverId: userId }).sort({
      createdAt: -1,
    });

    return res.json({ success: true, vehicles });
  } catch (err) {
    console.error("getVehiclesByUserId error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * PUBLIC VEHICLES (for 4ON4_WORLD)
 */
exports.getPublicVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find()
      .sort({ createdAt: -1 })
      .populate("driverId", [
        "firstName",
        "citizenship",
        "level",
        "languages",
        "profileImage",
      ]);

    return res.json({ success: true, vehicles });
  } catch (err) {
    console.error("getPublicVehicles error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * DELETE VEHICLE
 */
exports.deleteVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const found = await Vehicle.findById(vehicleId);
    if (!found) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    await Vehicle.findByIdAndDelete(vehicleId);

    return res.json({ success: true, message: "Vehicle deleted" });
  } catch (err) {
    console.error("deleteVehicle error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * UPDATE VEHICLE + UPDATE IMAGES
 */
exports.updateVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { plateNumber, capacity, windowType, model } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    if (plateNumber) vehicle.plateNumber = plateNumber;
    if (capacity) vehicle.capacity = capacity;
    if (windowType) vehicle.windowType = windowType;
    if (model) vehicle.model = model;

    // Replace old images if new ones uploaded
    if (req.files && req.files.length > 0) {
      vehicle.images = req.files.map((file) => cleanFilePath(file.path));
    }

    await vehicle.save();

    return res.json({ success: true, vehicle });
  } catch (err) {
    console.error("updateVehicle error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
