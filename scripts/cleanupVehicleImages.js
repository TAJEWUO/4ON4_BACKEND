// scripts/cleanupVehicleImages.js
// Clean up vehicle image references that don't exist on disk
require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

const VehicleSchema = new mongoose.Schema({}, { strict: false });
const Vehicle = mongoose.model("Vehicle", VehicleSchema);

async function cleanupVehicleImages() {
  await connectDB();

  console.log("\n🔍 Scanning vehicles for broken image references...\n");

  const vehicles = await Vehicle.find({});
  let totalCleaned = 0;
  let vehiclesUpdated = 0;

  for (const vehicle of vehicles) {
    if (!vehicle.images || vehicle.images.length === 0) continue;

    const validImages = [];
    const brokenImages = [];

    for (const img of vehicle.images) {
      const imagePath = typeof img === "string" ? img : img.path;
      if (!imagePath) continue;

      // Extract relative path
      const relativePath = imagePath.replace(/^https?:\/\/[^\/]+\//, "");
      const fullPath = path.join(__dirname, "..", relativePath);

      if (fs.existsSync(fullPath)) {
        validImages.push(img);
      } else {
        brokenImages.push(imagePath);
        console.log(`❌ Broken: ${vehicle.plateNumber} - ${imagePath}`);
      }
    }

    if (brokenImages.length > 0) {
      vehicle.images = validImages;
      await vehicle.save();
      vehiclesUpdated++;
      totalCleaned += brokenImages.length;
      console.log(`✅ Cleaned ${brokenImages.length} broken image(s) from ${vehicle.plateNumber}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Vehicles scanned: ${vehicles.length}`);
  console.log(`   Vehicles updated: ${vehiclesUpdated}`);
  console.log(`   Broken images removed: ${totalCleaned}`);

  await mongoose.disconnect();
  process.exit(0);
}

cleanupVehicleImages().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
