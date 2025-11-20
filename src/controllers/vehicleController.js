const Vehicle = require("../models/Vehicle");
const User = require("../models/user");

exports.addVehicle = async (req, res) => {
  try {
    const { plateNumber, capacity, windowType, model } = req.body;

    if (!plateNumber || !capacity || !windowType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const images = (req.files || []).map((f) => f.path);

    const vehicle = await Vehicle.create({
      driverId: req.user.id,
      plateNumber,
      capacity,
      windowType,
      model,
      images,
    });

    res.json({ message: "Vehicle added", vehicle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// vehicles for current logged-in driver
exports.getMyVehicles = async (req, res) => {
  try {
    const list = await Vehicle.find({ driverId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// public vehicle list (limited driver info)
exports.getPublicVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find()
      .sort({ createdAt: -1 })
      .populate("driverId", ["firstName", "citizenship", "level", "languages", "profileImage"]);

    res.json(vehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
