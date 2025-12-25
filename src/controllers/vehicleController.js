// src/controllers/vehicleController.js
const Vehicle = require("../models/Vehicle");
const { ok, error } = require("../utils/response");
const { deleteFile } = require("../services/fileService");
const { convertMultipleToWebP } = require("../utils/imageConverter");
const { API_URL } = require("../config/env");

// Upload vehicle (FormData). Files: images (max 3), documents (pdfs)
exports.uploadVehicle = async (req, res) => {
  try {
    console.log("[UPLOAD VEHICLE] Starting upload...");
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

    console.log("[UPLOAD VEHICLE] Request body:", {
      plateNumber,
      model,
      seatCount,
      tripType: typeof tripType === 'string' ? tripType.substring(0, 100) : tripType,
      color,
      windowType,
      sunroof,
      fourByFour
    });

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
        console.log("[UPLOAD VEHICLE] Processing", req.files.images.length, "images");
        const imagePaths = [];
        for (const f of req.files.images.slice(0, 5)) {
          console.log("[UPLOAD VEHICLE] Original image path:", f.path);
          imagePaths.push(f.path);
        }
        // Convert all images to WebP
        const webpPaths = await convertMultipleToWebP(imagePaths);
        console.log("[UPLOAD VEHICLE] WebP conversion complete. Paths:", webpPaths);
        
        webpPaths.forEach(webpPath => {
          const relativePath = webpPath.replace(/\\/g, '/').split('uploads/')[1];
          const fullPath = `uploads/${relativePath}`;
          console.log("[UPLOAD VEHICLE] Adding image to vehicle:", fullPath);
          images.push({ path: fullPath });
        });
        
        console.log("[UPLOAD VEHICLE] Total images to save:", images.length);
      }
      // documents field
      if (req.files.documents) {
        for (const f of req.files.documents) {
          docs.push({ path: `uploads/vehicles/${f.filename}` });
        }
      }
    }

    console.log("[UPLOAD VEHICLE] Parsing tripType...");
    let parsedTripType = [];
    try {
      parsedTripType = Array.isArray(tripType) ? tripType : (tripType ? JSON.parse(tripType) : []);
      console.log("[UPLOAD VEHICLE] Parsed tripType:", parsedTripType);
    } catch (parseError) {
      console.error("[UPLOAD VEHICLE] Failed to parse tripType:", parseError);
      console.error("[UPLOAD VEHICLE] tripType value:", tripType);
      return error(res, `Invalid tripType format: ${parseError.message}`, 400);
    }

    console.log("[UPLOAD VEHICLE] Creating vehicle document...");
    const veh = new Vehicle({
      userId,
      plateNumber,
      model: model || "",
      seatCount: seatCount ? Number(seatCount) : 4,
      tripType: parsedTripType,
      color: color || "",
      windowType: windowType || "GLASS",
      sunroof: !!sunroofBool,
      fourByFour: !!fourByFourBool,
      additionalFeatures: additionalFeatures || "",
      images,
      documents: docs,
    });

    console.log("[UPLOAD VEHICLE] Saving to database...");
    await veh.save();
    console.log("[UPLOAD VEHICLE] Vehicle saved successfully:", veh._id);
    return ok(res, { vehicle: veh });
  } catch (err) {
    console.error("[UPLOAD VEHICLE] Error:", err);
    console.error("[UPLOAD VEHICLE] Error stack:", err.stack);
    return error(res, "Server error", 500);
  }
};

exports.getVehiclesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const vehicles = await Vehicle.find({ userId }).lean();
    const baseUrl = API_URL;
    
    console.log("[GET VEHICLES] Found", vehicles.length, "vehicles for user", userId);
    
    // Convert file refs to full URLs for frontend
    const sanitized = vehicles.map(v => {
      // Handle images - extract path from object or use string directly
      v.images = (v.images || []).map(i => {
        let imagePath = typeof i === 'object' ? i.path : i;
        // Remove any leading slashes
        imagePath = imagePath.replace(/^\/?/, '');
        // If already a full URL, return as-is
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          return imagePath;
        }
        // Otherwise construct full URL
        const fullUrl = `${baseUrl}/${imagePath}`;
        console.log("[GET VEHICLES] Image:", imagePath, "->", fullUrl);
        return fullUrl;
      });
      
      // Handle documents
      v.documents = (v.documents || []).map(d => {
        let docPath = typeof d === 'object' ? d.path : d;
        docPath = docPath.replace(/^\/?/, '');
        if (docPath.startsWith('http://') || docPath.startsWith('https://')) {
          return docPath;
        }
        return `${baseUrl}/${docPath}`;
      });
      
      return v;
    });
    
    console.log("[GET VEHICLES] Sample vehicle:", sanitized[0] ? {
      plateNumber: sanitized[0].plateNumber,
      imagesCount: sanitized[0].images?.length,
      images: sanitized[0].images
    } : 'No vehicles');
    
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
    
    const baseUrl = API_URL;
    
    // Handle images - extract path from object or use string directly
    v.images = (v.images || []).map(i => {
      let imagePath = typeof i === 'object' ? i.path : i;
      imagePath = imagePath.replace(/^\/?/, '');
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      return `${baseUrl}/${imagePath}`;
    });
    
    // Handle documents
    v.documents = (v.documents || []).map(d => {
      let docPath = typeof d === 'object' ? d.path : d;
      docPath = docPath.replace(/^\/?/, '');
      if (docPath.startsWith('http://') || docPath.startsWith('https://')) {
        return docPath;
      }
      return `${baseUrl}/${docPath}`;
    });
    
    console.log("[GET VEHICLE BY ID] Returning vehicle:", {
      plateNumber: v.plateNumber,
      imagesCount: v.images?.length,
      images: v.images
    });
    
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

    console.log("[UPDATE VEHICLE] Updating vehicle:", vehicleId);
    console.log("[UPDATE VEHICLE] Current images count:", v.images?.length || 0);
    console.log("[UPDATE VEHICLE] Remove image paths:", removeImagePaths);

    if (plateNumber !== undefined) v.plateNumber = plateNumber;
    if (model !== undefined) v.model = model;
    if (seatCount !== undefined && seatCount !== "") v.seatCount = Number(seatCount);
    if (tripType !== undefined) {
      v.tripType = Array.isArray(tripType) ? tripType : (tripType ? JSON.parse(tripType) : []);
    }
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
      console.log("[UPDATE VEHICLE] Removing images:", removeArr);
      v.images = (v.images || []).filter(img => {
        const imgPath = img.path || img;
        if (removeArr.includes(imgPath)) {
          console.log("[UPDATE VEHICLE] Deleting file:", imgPath);
          deleteFile(imgPath);
          return false;
        }
        return true;
      });
      console.log("[UPDATE VEHICLE] Images after removal:", v.images.length);
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

    // Add new images if present (APPEND to existing, don't replace)
    if (req.files && req.files.images) {
      console.log("[UPDATE VEHICLE] Adding new images:", req.files.images.length);
      const currentImageCount = v.images?.length || 0;
      const availableSlots = 5 - currentImageCount;
      
      if (availableSlots <= 0) {
        return error(res, "Maximum 5 images allowed. Please delete some images first.", 400);
      }

      const imagePaths = [];
      const filesToProcess = req.files.images.slice(0, availableSlots);
      console.log(`[UPDATE VEHICLE] Processing ${filesToProcess.length} new images (${availableSlots} slots available)`);
      
      for (const f of filesToProcess) {
        imagePaths.push(f.path);
      }
      
      // Convert all images to WebP
      const webpPaths = await convertMultipleToWebP(imagePaths);
      webpPaths.forEach(webpPath => {
        const relativePath = webpPath.replace(/\\/g, '/').split('uploads/')[1];
        const fullPath = `uploads/${relativePath}`;
        console.log("[UPDATE VEHICLE] Adding new image:", fullPath);
        v.images.push({ path: fullPath });
      });
      
      console.log("[UPDATE VEHICLE] Total images after addition:", v.images.length);
    }

    // Add new documents if present
    if (req.files && req.files.documents) {
      for (const f of req.files.documents) {
        v.documents.push({ path: `uploads/vehicles/${f.filename}` });
      }
    }

    v.updatedAt = new Date();
    await v.save();
    
    console.log("[UPDATE VEHICLE] Vehicle updated successfully with", v.images.length, "images");
    return ok(res, { vehicle: v });
  } catch (err) {
    console.error("[UPDATE VEHICLE] Error:", err);
    return error(res, "Server error", 500);
  }
};

// Delete individual image from vehicle
exports.deleteVehicleImage = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { imagePath } = req.body;
    const userId = req.user && req.user.id;
    
    console.log("[DELETE IMAGE] Vehicle ID:", vehicleId);
    console.log("[DELETE IMAGE] Image path:", imagePath);
    
    const v = await Vehicle.findById(vehicleId);
    if (!v) return error(res, "Vehicle not found", 404);
    if (!v.userId.equals(userId)) return error(res, "Unauthorized", 403);

    if (!imagePath) return error(res, "Image path required", 400);

    // Find and remove the image
    const initialCount = v.images?.length || 0;
    v.images = (v.images || []).filter(img => {
      const imgPath = img.path || img;
      if (imgPath === imagePath) {
        console.log("[DELETE IMAGE] Deleting file:", imgPath);
        try {
          deleteFile(imgPath);
        } catch (e) {
          console.error("[DELETE IMAGE] Failed to delete file:", e);
        }
        return false;
      }
      return true;
    });

    if (v.images.length === initialCount) {
      return error(res, "Image not found", 404);
    }

    v.updatedAt = new Date();
    await v.save();
    
    console.log("[DELETE IMAGE] Image deleted. Remaining:", v.images.length);
    return ok(res, { message: "Image deleted", remainingImages: v.images.length });
  } catch (err) {
    console.error("[DELETE IMAGE] Error:", err);
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
