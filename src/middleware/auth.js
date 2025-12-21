const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const headerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieToken = req.cookies?.accessToken || null; // optional future fallback
  const token = headerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ success: false, message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    // DEBUG - print verification error (remove in production)
    console.error("[auth] JWT verify failed:", err?.message);
    console.error("[auth] token preview:", token ? `${token.slice(0,6)}...${token.slice(-6)}` : "none");
    return res.status(401).json({ success: false, message: "Token is not valid" });
  }
};