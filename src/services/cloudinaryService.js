const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Local file path
 * @param {string} folder - Cloudinary folder (e.g., 'users', 'vehicles')
 * @returns {Promise<{url: string, publicId: string}>}
 */
async function uploadToCloudinary(filePath, folder = 'uploads') {
  try {
    console.log(`[Cloudinary] Uploading ${filePath} to folder: ${folder}`);
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `4on4/${folder}`,
      resource_type: 'image',
      format: 'webp', // Auto-convert to WebP
      quality: 'auto:good',
      fetch_format: 'auto'
    });

    console.log(`[Cloudinary] Upload successful:`, result.secure_url);

    // Delete local file after successful upload
    try {
      await fs.unlink(filePath);
      console.log(`[Cloudinary] Deleted local file: ${filePath}`);
    } catch (unlinkErr) {
      console.warn(`[Cloudinary] Could not delete local file:`, unlinkErr.message);
    }

    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('[Cloudinary] Upload error:', error);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 */
async function deleteFromCloudinary(publicId) {
  try {
    if (!publicId) {
      console.warn('[Cloudinary] No public ID provided for deletion');
      return;
    }

    console.log(`[Cloudinary] Deleting image: ${publicId}`);
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`[Cloudinary] Delete result:`, result);
    return result;
  } catch (error) {
    console.error('[Cloudinary] Delete error:', error);
    // Don't throw - deletion failures shouldn't break the app
  }
}

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null}
 */
function getPublicIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  
  // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
  const match = url.match(/\/v\d+\/(.+)\.\w+$/);
  return match ? match[1] : null;
}

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  getPublicIdFromUrl,
  cloudinary
};
