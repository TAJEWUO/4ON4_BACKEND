// src/routes/vehicleRoutes.js
const express = require("express");
const router = express.Router();
const vehicleController = require("../controllers/vehicleController");
const auth = require("../middleware/auth");
const { uploadVehicle } = require("../middleware/upload");

// upload vehicle: images (up to 3) under field 'images', documents under 'documents'
router.post(
  "/upload",
  auth,
  uploadVehicle.fields([
    { name: "images", maxCount: 3 },
    { name: "documents", maxCount: 10 },
  ]),
  vehicleController.uploadVehicle
);

router.get("/:userId", auth, vehicleController.getVehiclesByUser);
router.get("/single/:vehicleId", auth, vehicleController.getVehicleById);

router.put(
  "/:vehicleId",
  auth,
  uploadVehicle.fields([
    { name: "images", maxCount: 3 },
    { name: "documents", maxCount: 10 },
  ]),
  vehicleController.updateVehicle
);

router.delete("/:vehicleId", auth, vehicleController.deleteVehicle);

module.exports = router;
