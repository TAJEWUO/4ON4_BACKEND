// src/services/fileService.js
const path = require("path");
const fs = require("fs");

function filePathFor(relativePath) {
  if (!relativePath) return null;
  // relativePath e.g. uploads/vehicles/123.jpg
  return path.join(process.cwd(), relativePath);
}

function deleteFile(relativePath) {
  try {
    if (!relativePath) return false;
    const p = filePathFor(relativePath);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      return true;
    }
    return false;
  } catch (err) {
    console.warn("deleteFile error:", err.message);
    return false;
  }
}

module.exports = { filePathFor, deleteFile };
