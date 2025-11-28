const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const auth = require("../middleware/auth");

const {
  addVehicle,
  getMyVehicles,
  getPublicVehicles,
  addVehicleFromBodyUserId,
  getVehiclesByUserId,
  deleteVehicle,
  updateVehicle,
} = require("../controllers/vehicleController");

// driver adds vehicle (max 3 images) with JWT auth
router.post("/add", auth, upload.array("images", 3), addVehicle);

// driver sees own vehicles (JWT auth)
router.get("/my", auth, getMyVehicles);

// public view for 4ON4 PUBLIC
router.get("/public", getPublicVehicles);

// DEV-MODE: Upload vehicle without JWT (frontend uses this)
router.post("/upload", upload.array("images", 3), addVehicleFromBodyUserId);

// DEV-MODE: Get vehicles by userId (frontend uses this)
router.get("/:userId", getVehiclesByUserId);

// DELETE vehicle by ID
router.delete("/:vehicleId", deleteVehicle);

// UPDATE vehicle by ID (optional new images)
router.put("/:vehicleId", upload.array("images", 3), updateVehicle);

module.exports = router;
