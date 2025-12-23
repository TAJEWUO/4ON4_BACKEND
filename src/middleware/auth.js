const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  console.log("\n[AUTH MIDDLEWARE] --- START ---");
  console.log("[AUTH] Method:", req.method);
  console.log("[AUTH] Path:", req.path);
  console.log("[AUTH] Authorization header:", req.headers.authorization ? "Present" : "Missing");
  
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  console.log("[AUTH] Token:", token ? `${token.slice(0,10)}...` : "None");

  if (!token) {
    console.log("[AUTH] ❌ REJECTED: No token found");
    return res.status(401).json({ success: false, message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    console.log("[AUTH] ✅ VERIFIED: User ID:", decoded.id);
    console.log("[AUTH MIDDLEWARE] --- END (SUCCESS) ---\n");
    next();
  } catch (err) {
    console.error("[AUTH] ❌ JWT verify failed:", err?.message);
    console.error("[AUTH] Token preview:", token ? `${token.slice(0,10)}...${token.slice(-10)}` : "none");
    console.log("[AUTH MIDDLEWARE] --- END (FAILED) ---\n");
    return res.status(401).json({ success: false, message: "Token is not valid" });
  }
};
