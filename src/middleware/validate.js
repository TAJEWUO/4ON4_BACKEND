// src/middleware/validate.js

// usage: validateBody(['plateNumber','capacity'])
function validateBody(requiredFields = []) {
  return (req, res, next) => {
    const missing = [];
    for (const f of requiredFields) {
      if (req.body[f] === undefined || req.body[f] === null || req.body[f] === "") {
        missing.push(f);
      }
    }
    if (missing.length) {
      return res.status(400).json({ ok: false, message: `Missing fields: ${missing.join(", ")}` });
    }
    next();
  };
}

module.exports = { validateBody };
