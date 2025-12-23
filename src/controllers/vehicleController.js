// src/controllers/vehicleController.js
const Vehicle = require("../models/Vehicle");
const { ok, error } = require("../utils/response");
const { deleteFile } = require("../services/fileService");
const { convertMultipleToWebP } = require("../utils/imageConverter");

// Upload vehicle (FormData). Files: images (max 3), documents (pdfs)
exports.uploadVehicle = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return error(res, "Unauthorized", 401);

    const {
      plateNumber,
      model,
      seatCount,
      tripType,
      color,
      windowType,
      sunroof,
      fourByFour,
      additionalFeatures,
    } = req.body;

    if (!plateNumber) return error(res, "plateNumber required", 400);

    // parse boolean fields
    const sunroofBool = sunroof === "true" || sunroof === true || sunroof === "1";
    const fourByFourBool = fourByFour === "true" || fourByFour === true || fourByFour === "1";

    // Gather files
    const images = [];
    const docs = [];

    if (req.files) {
      // images field (1-5 images)
      if (req.files.images) {
        const imagePaths = [];
        for (const f of req.files.images.slice(0, 5)) {
          imagePaths.push(f.path);
        }
        // Convert all images to WebP
        const webpPaths = await convertMultipleToWebP(imagePaths);
        webpPaths.forEach(webpPath => {
          const relativePath = webpPath.replace(/\\/g, '/').split('uploads/')[1];
          images.push({ path: `uploads/${relativePath}` });
        });
      }
      // documents field
      if (req.files.documents) {
        for (const f of req.files.documents) {
          docs.push({ path: `uploads/vehicles/${f.filename}` });
        }
      }
    }

    const veh = new Vehicle({
      userId,
      plateNumber,
      model: model || "",
      seatCount: seatCount ? Number(seatCount) : 4,
      tripType: tripType || "",
      color: color || "",
      windowType: windowType || "GLASS",
      sunroof: !!sunroofBool,
      fourByFour: !!fourByFourBool,
      additionalFeatures: additionalFeatures || "",
      images,
      documents: docs,
    });

    await veh.save();
    return ok(res, { vehicle: veh });
  } catch (err) {
    console.error("uploadVehicle:", err);
    return error(res, "Server error", 500);
  }
};

exports.getVehiclesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const vehicles = await Vehicle.find({ userId }).lean();
    // convert file refs to path strings for frontend
    const sanitized = vehicles.map(v => {
      v.images = (v.images || []).map(i => i.path || i);
      v.documents = (v.documents || []).map(d => d.path || d);
      return v;
    });
    return ok(res, { vehicles: sanitized });
  } catch (err) {
    console.error("getVehiclesByUser:", err);
    return error(res, "Server error", 500);
  }
};

exports.getVehicleById = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    console.log("[GET VEHICLE BY ID] Fetching vehicle:", vehicleId);
    const v = await Vehicle.findById(vehicleId).lean();
    if (!v) return error(res, "Vehicle not found", 404);
    console.log("[GET VEHICLE BY ID] Found vehicle:", {
      plateNumber: v.plateNumber,
      model: v.model,
      seatCount: v.seatCount,
      tripType: v.tripType,
      color: v.color,
      windowType: v.windowType,
      imagesCount: v.images?.length
    });
    v.images = (v.images || []).map(i => i.path || i);
    v.documents = (v.documents || []).map(d => d.path || d);
    console.log("[GET VEHICLE BY ID] Returning vehicle with images:", v.images);
    return ok(res, { vehicle: v });
  } catch (err) {
    console.error("getVehicleById:", err);
    return error(res, "Server error", 500);
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const userId = req.user && req.user.id;
    const v = await Vehicle.findById(vehicleId);
    if (!v) return error(res, "Vehicle not found", 404);
    if (!v.userId.equals(userId)) return error(res, "Unauthorized", 403);

    const {
      plateNumber,
      model,
      seatCount,
      tripType,
      color,
      windowType,
      sunroof,
      fourByFour,
      additionalFeatures,
      removeImagePaths, // optional comma separated list of image paths to remove
      removeDocumentPaths,
    } = req.body;

    if (plateNumber !== undefined) v.plateNumber = plateNumber;
    if (model !== undefined) v.model = model;
    if (seatCount !== undefined && seatCount !== "") v.seatCount = Number(seatCount);
    if (tripType !== undefined) v.tripType = tripType;
    if (color !== undefined) v.color = color;
    if (windowType !== undefined) v.windowType = windowType;
    if (sunroof !== undefined) v.sunroof = sunroof === "true" || sunroof === true;
    if (fourByFour !== undefined) v.fourByFour = fourByFour === "true" || fourByFour === true;

    if (additionalFeatures) {
      try {
        v.additionalFeatures = typeof additionalFeatures === "string" && additionalFeatures.startsWith("[") ? JSON.parse(additionalFeatures) : additionalFeatures.split ? additionalFeatures.split(",").map(s => s.trim()).filter(Boolean) : [];
      } catch (e) {
        v.additionalFeatures = (additionalFeatures || "").split(",").map(s => s.trim()).filter(Boolean);
      }
    }

    // Remove images if requested
    if (removeImagePaths) {
      const removeArr = removeImagePaths.split(",").map(s => s.trim()).filter(Boolean);
      v.images = (v.images || []).filter(img => {
        if (removeArr.includes(img.path || img)) {
          deleteFile(img.path || img);
          return false;
        }
        return true;
      });
    }

    // Remove docs if requested
    if (removeDocumentPaths) {
      const remDocs = removeDocumentPaths.split(",").map(s => s.trim()).filter(Boolean);
      v.documents = (v.documents || []).filter(doc => {
        if (remDocs.includes(doc.path || doc)) {
          deleteFile(doc.path || doc);
          return false;
        }
        return true;
      });
    }

    // Add new files if present
    if (req.files) {
      if (req.files.images) {
        const imagePaths = [];
        for (const f of req.files.images.slice(0, 3)) {
          imagePaths.push(f.path);
        }
        // Convert all images to WebP
        const webpPaths = await convertMultipleToWebP(imagePaths);
        webpPaths.forEach(webpPath => {
          const relativePath = webpPath.replace(/\\/g, '/').split('uploads/')[1];
          v.images.push({ path: `uploads/${relativePath}` });
        });
      }
      if (req.files.documents) {
        for (const f of req.files.documents) {
          v.documents.push({ path: `uploads/vehicles/${f.filename}` });
        }
      }
    }

    v.updatedAt = new Date();
    await v.save();
    return ok(res, { vehicle: v });
  } catch (err) {
    console.error("updateVehicle:", err);
    return error(res, "Server error", 500);
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const userId = req.user && req.user.id;
    const v = await Vehicle.findById(vehicleId);
    if (!v) return error(res, "Vehicle not found", 404);
    if (!v.userId.equals(userId)) return error(res, "Unauthorized", 403);

    // delete files
    for (const img of v.images || []) {
      try { deleteFile(img.path || img); } catch (e) {}
    }
    for (const d of v.documents || []) {
      try { deleteFile(d.path || d); } catch (e) {}
    }

    await Vehicle.deleteOne({ _id: vehicleId });
    return ok(res, { message: "Vehicle deleted" });
  } catch (err) {
    console.error("deleteVehicle:", err);
    return error(res, "Server error", 500);
  }
};
