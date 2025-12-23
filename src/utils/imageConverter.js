// src/utils/imageConverter.js
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

/**
 * Convert image to WebP format
 * @param {string} inputPath - Path to the original image
 * @returns {Promise<string>} - Path to the converted WebP image
 */
async function convertToWebP(inputPath) {
  try {
    // Generate WebP filename
    const ext = path.extname(inputPath);
    const webpPath = inputPath.replace(ext, ".webp");

    // Convert to WebP
    await sharp(inputPath)
      .webp({ quality: 85 }) // 85% quality for good balance
      .toFile(webpPath);

    // Delete original file
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    return webpPath;
  } catch (err) {
    console.error("WebP conversion error:", err);
    // If conversion fails, return original path
    return inputPath;
  }
}

/**
 * Convert multiple images to WebP
 * @param {Array<string>} imagePaths - Array of image paths
 * @returns {Promise<Array<string>>} - Array of converted WebP paths
 */
async function convertMultipleToWebP(imagePaths) {
  const promises = imagePaths.map((path) => convertToWebP(path));
  return Promise.all(promises);
}

module.exports = { convertToWebP, convertMultipleToWebP };
