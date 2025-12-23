// scripts/createTestUser.js
// Creates a test user in MongoDB for local development

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");
const UserProfile = require("../src/models/UserProfile");

const TEST_PHONE = "+254712345678"; // Change this if needed
const TEST_PIN = "1234";

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    // Check if test user already exists
    let user = await User.findOne({ phoneFull: TEST_PHONE });
    
    if (user) {
      console.log("✓ Test user already exists!");
      console.log("\n📋 Copy these values to your .env.local:");
      console.log(`NEXT_PUBLIC_TEST_USER_ID=${user._id}`);
      console.log(`NEXT_PUBLIC_TEST_PHONE=${TEST_PHONE}`);
      
      // Check for profile
      const profile = await UserProfile.findOne({ userId: user._id });
      if (profile) {
        console.log(`\n✓ Profile exists for this user`);
      } else {
        console.log(`\n⚠️  No profile yet - will be created on first login`);
      }
    } else {
      // Create new test user
      const hashedPin = await bcrypt.hash(TEST_PIN, 10);
      
      user = new User({
        phoneFull: TEST_PHONE,
        phoneTail: TEST_PHONE.slice(-9),
        password: hashedPin,
        role: "driver",
        isActive: true,
      });
      
      await user.save();
      console.log("✓ Test user created!");
      console.log(`\n📋 Copy these values to your .env.local:`);
      console.log(`NEXT_PUBLIC_TEST_USER_ID=${user._id}`);
      console.log(`NEXT_PUBLIC_TEST_PHONE=${TEST_PHONE}`);
      console.log(`\nTest credentials:`);
      console.log(`Phone: ${TEST_PHONE.slice(-9)} (last 9 digits: 712345678)`);
      console.log(`PIN: ${TEST_PIN}`);
    }

    await mongoose.disconnect();
    console.log("\n✓ Done!");
    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error.message);
    process.exit(1);
  }
}

createTestUser();
