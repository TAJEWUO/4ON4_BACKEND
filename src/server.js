// server.js
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

/**
 * Allowed origins
 * - FRONTEND_ORIGIN env (if set)
 * - localhost dev
 * - local network IP(s) (add more as needed)
 * - production domains and Vercel subdomains
 */
const frontendEnv = process.env.FRONTEND_ORIGIN;
const allowedOriginsList = [
  frontendEnv, // e.g., http://localhost:3000 or https://app.example.com
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.0.113:3000", // local network host you provided
  "https://4on4.world",
  "https://4on4.site",
].filter(Boolean); // remove falsy entries

// A list of regexes for allowed origin patterns (e.g., vercel)
const allowedOriginPatterns = [
  /\.vercel\.app$/, // allow any vercel.app subdomain
];

/**
 * CORS options with dynamic origin checking.
 * If the incoming origin is absent (e.g., server-to-server or curl),
 * we allow the request as long as credentials are not required by the client.
 */
const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like curl, mobile apps, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // exact matches
    if (allowedOriginsList.includes(origin)) return callback(null, true);

    // pattern matches
    for (const pattern of allowedOriginPatterns) {
      if (pattern.test(origin)) return callback(null, true);
    }

    // Optionally allow if FRONTEND_ORIGIN env is set and matches the start of origin
    if (frontendEnv && origin.startsWith(frontendEnv)) return callback(null, true);

    const msg = `CORS policy: origin '${origin}' not allowed`;
    return callback(new Error(msg), false);
  },
  credentials: true, // allow cookies to be sent
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 204,
};

// Middlewares
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(cors(corsOptions));

// handle preflight for all routes
app.options("*", cors(corsOptions));

// Connect DB
connectDB();

// Mount routes
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
  console.log(`🚀 Backend running on port ${PORT}`);
});