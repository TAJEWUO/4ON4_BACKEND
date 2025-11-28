// src/routes/publicRoutes.js

const express = require("express");
const router = express.Router();

const { getPublicVehicles } = require("../controllers/publicController");

// PUBLIC: fetch vehicles + safe driver info
router.get("/vehicles", getPublicVehicles);

module.exports = router;
