require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");

const app = express();

/* =======================
   CORS (FIXED & VALID)
======================= */
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://4on4.world",
      "https://www.4on4.world",
      "https://4on4.site",
      "https://www.4on4.site",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "5mb" }));

/* =======================
   DB
======================= */
connectDB();

/* =======================
   ROUTES (MUST BE BEFORE listen)
======================= */
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/vehicles", vehicleRoutes);

app.get("/", (req, res) => {
  res.json({ success: true, message: "4ON4 backend running" });
});

/* =======================
   START SERVER (LAST)
======================= */
const PORT = process.env.PORT || 3002;
app.listen(PORT, () =>
  console.log(`🚀 Backend running on port ${PORT}`)
);
