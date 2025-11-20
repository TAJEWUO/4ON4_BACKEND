const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const auth = require("../middleware/auth");
const {
  addVehicle,
  getMyVehicles,
  getPublicVehicles,
} = require("../controllers/vehicleController");

// driver adds vehicle (max 3 images)
router.post("/add", auth, upload.array("images", 3), addVehicle);

// driver sees own vehicles
router.get("/my", auth, getMyVehicles);

// public view for 4ON4 PUBLIC
router.get("/public", getPublicVehicles);

module.exports = router;
