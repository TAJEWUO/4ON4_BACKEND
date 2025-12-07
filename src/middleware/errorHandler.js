// src/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error(err && err.stack ? err.stack : err);
  const status = err.status || 500;
  const message = err.message || "Server error";
  res.status(status).json({ ok: false, message });
}

module.exports = errorHandler;
