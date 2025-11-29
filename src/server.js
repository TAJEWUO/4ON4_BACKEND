// src/server.js

// MUST be first
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

// ===============================
// CONNECT DATABASE (after dotenv)
// ===============================
connectDB();

// Body parser
app.use(express.json());

// ===============================
// CORS CONFIGURATION (FINAL)
// ===============================
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Allow preflight
app.options("*", cors());

// ===============================
// STATIC FILE SERVING (UPLOADS)
// ===============================
const uploadsPath = path.join(__dirname, "../uploads");
console.log("Serving uploads from:", uploadsPath);

app.use("/uploads", express.static(uploadsPath));

// ===============================
// ROUTES
// ===============================
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/public", publicRoutes);

// Health Check
app.get("/", (req, res) => {
  res.json({ status: "Backend is running" });
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

