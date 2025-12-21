 //github.com/TAJEWUO/4ON4_BACKEND/blob/ac91d7cb1643e507521bcfd047d4c74a95e64389/src/utils/token.js
// src/utils/token.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "please-set-jwt-secret";

const generateToken = (userId, expiresIn = "7d") => {
  // Standard payload: { id }
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };