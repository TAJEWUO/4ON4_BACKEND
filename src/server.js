require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");

const app = express();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://4on4.world",
    "https://4on4.site",
    /\.vercel\.app$/,
  ],
  credentials: true,
}));

app.use(express.json({ limit: "5mb" }));

// Connect DB
connectDB();

// ROUTES (ALL BEFORE listen)
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/vehicles", vehicleRoutes);

// Root check
app.get("/", (req, res) => {
  res.json({ success: true, message: "4ON4 backend running" });
});

// Start server LAST
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
