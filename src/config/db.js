// src/config/db.js

require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("❌ MONGODB_URI is missing in .env");
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
