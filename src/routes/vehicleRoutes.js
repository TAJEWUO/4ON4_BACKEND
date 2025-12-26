// src/routes/vehicleRoutes.js
const express = require("express");
const router = express.Router();
const vehicleController = require("../controllers/vehicleController");
const auth = require("../middleware/auth");
const { uploadVehicle } = require("../middleware/upload");

// Public endpoint - get all vehicles for showcase
router.get("/all", vehicleController.getAllVehicles);

// upload vehicle: images (up to 5) under field 'images', documents under 'documents'
router.post(
  "/upload",
  auth,
  uploadVehicle.fields([
    { name: "images", maxCount: 5 },
    { name: "documents", maxCount: 10 },
  ]),
  vehicleController.uploadVehicle
);

// Get vehicles by user - use /user/:userId to avoid conflict with /all
router.get("/user/:userId", auth, vehicleController.getVehiclesByUser);
router.get("/single/:vehicleId", auth, vehicleController.getVehicleById);

router.put(
  "/:vehicleId",
  auth,
  uploadVehicle.fields([
    { name: "images", maxCount: 5 },
    { name: "documents", maxCount: 10 },
  ]),
  vehicleController.updateVehicle
);

// Delete individual image from vehicle
router.delete("/:vehicleId/image", auth, vehicleController.deleteVehicleImage);

router.delete("/:vehicleId", auth, vehicleController.deleteVehicle);

module.exports = router;
