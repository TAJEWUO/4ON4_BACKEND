// scripts/cleanupOrphanedImages.js
// Remove image references from database when files don't exist on disk

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Define schema directly to avoid loading server
const fileRefSchema = new mongoose.Schema({
  path: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

const vehicleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plateNumber: { type: String, required: true },
    model: { type: String, default: "" },
    seatCount: { type: Number, default: 4, min: 4, max: 14 },
    tripType: [{ type: String }],
    color: { type: String },
    windowType: { type: String },
    sunroof: { type: Boolean, default: false },
    fourByFour: { type: Boolean, default: false },
    additionalFeatures: { type: String },
    images: [fileRefSchema],
    documents: [fileRefSchema],
  },
  { timestamps: true }
);

const Vehicle = mongoose.models.Vehicle || mongoose.model("Vehicle", vehicleSchema);

async function cleanupOrphanedVehicleImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const vehicles = await Vehicle.find({});
    console.log(`\nChecking ${vehicles.length} vehicles for orphaned images...\n`);

    let totalCleaned = 0;
    let vehiclesUpdated = 0;

    for (const vehicle of vehicles) {
      let cleaned = false;
      const validImages = [];

      for (const image of vehicle.images || []) {
        const imagePath = typeof image === 'object' ? image.path : image;
        const fullPath = path.join(__dirname, '..', imagePath);

        if (fs.existsSync(fullPath)) {
          validImages.push(image);
        } else {
          console.log(`❌ Missing: ${imagePath} (Vehicle: ${vehicle.plateNumber})`);
          totalCleaned++;
          cleaned = true;
        }
      }

      if (cleaned) {
        vehicle.images = validImages;
        await vehicle.save();
        vehiclesUpdated++;
        console.log(`✅ Updated vehicle ${vehicle.plateNumber} - removed ${vehicle.images.length - validImages.length} orphaned images`);
      }
    }

    console.log(`\n✨ Cleanup complete!`);
    console.log(`   - Vehicles checked: ${vehicles.length}`);
    console.log(`   - Vehicles updated: ${vehiclesUpdated}`);
    console.log(`   - Orphaned images removed: ${totalCleaned}\n`);

    process.exit(0);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
}

cleanupOrphanedVehicleImages();
