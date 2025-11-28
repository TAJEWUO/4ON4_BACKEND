// src/server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const publicRoutes = require("./routes/publicRoutes");

const app = express();

// Connect DB
connectDB();

// Body parser
app.use(express.json());

// ===============================
// FIXED CORS — FINAL & CORRECT
// ===============================
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// REQUIRED for POST/PUT/DELETE — fixes "Failed to fetch"
app.options("*", cors());

// ===============================
// FIXED STATIC FILE PATH
// ===============================
// __dirname → /src
// uploads folder → /uploads (parent folder)
const uploadsPath = path.join(__dirname, "../uploads");
console.log("Serving uploads from:", uploadsPath);

app.use("/uploads", express.static(uploadsPath));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/public", publicRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Backend is running" });
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
