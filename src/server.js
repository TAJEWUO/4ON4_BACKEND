require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("./config/db");

// routes
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");

const app = express();

// Log minimal ENV presence (DO NOT log secrets)
console.log("ENV CHECK: FRONTEND present:", !!(process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL));
console.log("ENV CHECK: MONGODB_URI present:", !!process.env.MONGODB_URI);
console.log("ENV CHECK: JWT_SECRET present:", !!process.env.JWT_SECRET);
console.log("ENV CHECK: TWILIO configured:", !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN && !!process.env.TWILIO_VERIFY_SID);

/**
 * Allowed origins
 */
const frontendEnv = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL;
const allowedOriginsList = [
  frontendEnv,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.0.113:3000",
  "https://4on4.world",
  "https://4on4.site",
].filter(Boolean);

const allowedOriginPatterns = [
  /\\.vercel\\.app$/,
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (curl or some mobile clients)
    if (!origin) return callback(null, true);

    if (allowedOriginsList.includes(origin)) return callback(null, true);

    for (const pattern of allowedOriginPatterns) {
      if (pattern.test(origin)) return callback(null, true);
    }

    console.warn(`CORS policy: origin '${origin}' not allowed`);
    return callback(new Error(`CORS policy: origin '${origin}' not allowed`), false);
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 204,
};

app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Connect DB
connectDB();

// Mount routes (these require your existing route files)
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/vehicles", vehicleRoutes);

// Root health check
app.get("/", (req, res) => {
  res.json({ success: true, message: "4ON4 backend running" });
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(` Backend running on port ${PORT}`);
});
