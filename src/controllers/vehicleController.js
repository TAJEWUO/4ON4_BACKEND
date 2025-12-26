// src/controllers/vehicleController.js
const Vehicle = require("../models/Vehicle");
const { ok, error } = require("../utils/response");
const { deleteFile } = require("../services/fileService");
const { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } = require("../services/cloudinaryService");

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

    // Upload files to Cloudinary
    const images = [];
    const docs = [];

    if (req.files) {
      // images field (1-5 images)
      if (req.files.images) {
        console.log("[UPLOAD VEHICLE] Uploading", req.files.images.length, "images to Cloudinary");
        for (const f of req.files.images.slice(0, 5)) {
          try {
            const cloudinaryResult = await uploadToCloudinary(f.path, 'vehicles');
            images.push({ 
              path: cloudinaryResult.url,
              publicId: cloudinaryResult.publicId
            });
            console.log("[UPLOAD VEHICLE] Image uploaded:", cloudinaryResult.url);
          } catch (uploadErr) {
            console.error("[UPLOAD VEHICLE] Failed to upload image:", uploadErr);
          }
        }
        console.log("[UPLOAD VEHICLE] Total images uploaded:", images.length);
      }
      // documents field
      if (req.files.documents) {
        console.log("[UPLOAD VEHICLE] Uploading", req.files.documents.length, "documents to Cloudinary");
        for (const f of req.files.documents) {
          try {
            const cloudinaryResult = await uploadToCloudinary(f.path, 'vehicles/documents');
            docs.push({ 
              path: cloudinaryResult.url,
              publicId: cloudinaryResult.publicId
            });
          } catch (uploadErr) {
            console.error("[UPLOAD VEHICLE] Failed to upload document:", uploadErr);
          }
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

exports.getAllVehicles = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const vehicles = await Vehicle.find({})
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
    
    console.log("[GET ALL VEHICLES] Found", vehicles.length, "vehicles");
    
    // Randomize order for variety
    const shuffled = vehicles.sort(() => Math.random() - 0.5);
    
    // Extract URLs
    const sanitized = shuffled.map(v => {
      v.images = (v.images || []).map(i => typeof i === 'object' ? i.path : i);
      v.documents = (v.documents || []).map(d => typeof d === 'object' ? d.path : d);
      return v;
    });
    
    return ok(res, { vehicles: sanitized });
  } catch (err) {
    console.error("getAllVehicles:", err);
    return error(res, "Server error", 500);
  }
};

exports.getVehiclesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const vehicles = await Vehicle.find({ userId }).lean();
    
    console.log("[GET VEHICLES] Found", vehicles.length, "vehicles for user", userId);
    
    // Cloudinary URLs are already full URLs, just extract them
    const sanitized = vehicles.map(v => {
      // Extract image URLs (already full Cloudinary URLs)
      v.images = (v.images || []).map(i => {
        return typeof i === 'object' ? i.path : i;
      });
      
      // Extract document URLs
      v.documents = (v.documents || []).map(d => {
        return typeof d === 'object' ? d.path : d;
      });
      
      return v;
    });
    
    console.log("[GET VEHICLES] Sample vehicle:", sanitized[0] ? {
      plateNumber: sanitized[0].plateNumber,
      imagesCount: sanitized[0].images?.length,
      firstImage: sanitized[0].images?.[0]
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
    
    // Extract Cloudinary URLs (already full URLs)
    v.images = (v.images || []).map(i => typeof i === 'object' ? i.path : i);
    v.documents = (v.documents || []).map(d => typeof d === 'object' ? d.path : d);
    
    console.log("[GET VEHICLE BY ID] Returning vehicle:", {
      plateNumber: v.plateNumber,
      imagesCount: v.images?.length,
      firstImage: v.images?.[0]
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
          console.log("[UPDATE VEHICLE] Deleting from Cloudinary:", imgPath);
          const publicId = img.publicId || getPublicIdFromUrl(imgPath);
          if (publicId) {
            deleteFromCloudinary(publicId);
          }
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
        const docPath = doc.path || doc;
        if (remDocs.includes(docPath)) {
          const publicId = doc.publicId || getPublicIdFromUrl(docPath);
          if (publicId) {
            deleteFromCloudinary(publicId);
          }
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

      const filesToProcess = req.files.images.slice(0, availableSlots);
      console.log(`[UPDATE VEHICLE] Uploading ${filesToProcess.length} new images to Cloudinary`);
      
      for (const f of filesToProcess) {
        try {
          const cloudinaryResult = await uploadToCloudinary(f.path, 'vehicles');
          v.images.push({ 
            path: cloudinaryResult.url,
            publicId: cloudinaryResult.publicId
          });
          console.log("[UPDATE VEHICLE] Image uploaded:", cloudinaryResult.url);
        } catch (uploadErr) {
          console.error("[UPDATE VEHICLE] Failed to upload image:", uploadErr);
        }
      }
      
      console.log("[UPDATE VEHICLE] Total images after addition:", v.images.length);
    }

    // Add new documents if present
    if (req.files && req.files.documents) {
      for (const f of req.files.documents) {
        try {
          const cloudinaryResult = await uploadToCloudinary(f.path, 'vehicles/documents');
          v.documents.push({ 
            path: cloudinaryResult.url,
            publicId: cloudinaryResult.publicId
          });
        } catch (uploadErr) {
          console.error("[UPDATE VEHICLE] Failed to upload document:", uploadErr);
        }
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
        console.log("[DELETE IMAGE] Deleting from Cloudinary:", imgPath);
        const publicId = img.publicId || getPublicIdFromUrl(imgPath);
        if (publicId) {
          deleteFromCloudinary(publicId);
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

    // Delete images from Cloudinary
    for (const img of v.images || []) {
      const publicId = img.publicId || getPublicIdFromUrl(img.path || img);
      if (publicId) {
        deleteFromCloudinary(publicId);
      }
    }
    // Delete documents from Cloudinary
    for (const d of v.documents || []) {
      const publicId = d.publicId || getPublicIdFromUrl(d.path || d);
      if (publicId) {
        deleteFromCloudinary(publicId);
      }
    }

    await Vehicle.deleteOne({ _id: vehicleId });
    return ok(res, { message: "Vehicle deleted" });
  } catch (err) {
    console.error("deleteVehicle:", err);
    return error(res, "Server error", 500);
  }
};
