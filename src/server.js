// src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db"); 

const authRoutes = require("./routes/authRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Connect DB
connectDB();

// ROUTES
app.use("/api/auth", authRoutes);

// Root check
app.get("/", (req, res) => {
  res.json({ success: true, message: "4ON4 backend running" });
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
