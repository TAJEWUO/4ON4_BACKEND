// src/services/tokenService.js
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_REFRESH_SECRET } = require("../config/env");

function signAccess(payload, expiresIn = "2h") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function signRefresh(payload, expiresIn = "14d") {
  return jwt.sign(payload, JWT_REFRESH_SECRET || JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = { signAccess, signRefresh, verifyToken };
