 //github.com/TAJEWUO/4ON4_BACKEND/blob/ac91d7cb1643e507521bcfd047d4c74a95e64389/src/server.js
// src/server.js (patch region at CORS setup)
const frontendEnv = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL;
const allowedOriginsList = [
  frontendEnv, // supports either FRONTEND_ORIGIN or FRONTEND_URL env var
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.0.113:3000",
  "https://4on4.world",
  "https://4on4.site",
].filter(Boolean);

const allowedOriginPatterns = [
  /\.vercel\.app$/,
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (curl or some mobile clients)
    if (!origin) return callback(null, true);

    if (allowedOriginsList.includes(origin)) return callback(null, true);

    for (const pattern of allowedOriginPatterns) {
      if (pattern.test(origin)) return callback(null, true);
    }

    // Debugging: log rejected origin so we can see what the client is sending
    console.warn(`[CORS] Rejected origin: ${origin}`);
    return callback(new Error(`CORS policy: origin '${origin}' not allowed`), false);
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 204,
};