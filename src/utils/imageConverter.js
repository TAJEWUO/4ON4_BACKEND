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
    console.log("[ImageConverter] Converting to WebP:", inputPath);
    
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      console.error("[ImageConverter] Input file does not exist:", inputPath);
      throw new Error(`Input file not found: ${inputPath}`);
    }

    // Generate WebP filename
    const ext = path.extname(inputPath);
    const webpPath = inputPath.replace(ext, ".webp");

    console.log("[ImageConverter] Output path:", webpPath);

    // Convert to WebP
    await sharp(inputPath)
      .webp({ quality: 85 }) // 85% quality for good balance
      .toFile(webpPath);

    console.log("[ImageConverter] Conversion successful:", webpPath);
    
    // Verify the output file was created
    if (!fs.existsSync(webpPath)) {
      console.error("[ImageConverter] Output file was not created:", webpPath);
      throw new Error(`Failed to create WebP file: ${webpPath}`);
    }

    // Delete original file
    if (fs.existsSync(inputPath) && inputPath !== webpPath) {
      fs.unlinkSync(inputPath);
      console.log("[ImageConverter] Deleted original file:", inputPath);
    }

    return webpPath;
  } catch (err) {
    console.error("[ImageConverter] WebP conversion error:", err);
    // If conversion fails, return original path if it exists
    if (fs.existsSync(inputPath)) {
      console.warn("[ImageConverter] Returning original path due to conversion failure");
      return inputPath;
    }
    throw err;
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
