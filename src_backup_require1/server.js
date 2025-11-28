require("dotenv").config();        // MUST BE FIRST
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path");


const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");

const app = express();

// connect DB
connectDB();

// middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

app.use(express.json());

// routes
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/vehicles", vehicleRoutes);

// health check
app.get("/", (req, res) => {
  res.json({ message: "Backend is running." });
});

// start
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
