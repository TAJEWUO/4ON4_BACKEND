# Cloudinary Migration Summary

## Overview
Successfully migrated from local filesystem storage to Cloudinary cloud storage to solve image persistence issues on Render's ephemeral storage.

## Problem Statement
- **Issue**: Images uploaded to the backend were being deleted on every Render deployment/restart
- **Root Cause**: Render uses ephemeral storage - files are not persisted across deployments
- **Impact**: Users' vehicle and profile images would disappear after each deployment
- **Solution**: Migrate to Cloudinary for permanent cloud storage with HTTPS URLs

## Changes Made

### 1. Cloudinary Service Created
**File**: `src/services/cloudinaryService.js`

Created a centralized service with three main functions:
- `uploadToCloudinary(filePath, folder)`: Uploads images to Cloudinary with automatic WebP conversion
- `deleteFromCloudinary(publicId)`: Deletes images from Cloudinary
- `getPublicIdFromUrl(url)`: Extracts public ID from Cloudinary URLs for deletion

**Configuration**: Uses environment variables:
- `CLOUDINARY_CLOUD_NAME=dogahiv53`
- `CLOUDINARY_API_KEY=696493524999996`
- `CLOUDINARY_API_SECRET=3y87hVwW-QOiRRivqvKJ012QJBU`

### 2. Database Models Updated
**Files**: `src/models/Vehicle.js`, `src/models/UserProfile.js`

Updated the `fileRefSchema` to include `publicId`:
```javascript
const fileRefSchema = new mongoose.Schema({
  path: { type: String, required: true },
  publicId: { type: String }, // Added for Cloudinary deletion
  uploadedAt: { type: Date, default: Date.now },
});
```

### 3. Vehicle Controller Migrated
**File**: `src/controllers/vehicleController.js`

**Changes**:
- Removed imports: `convertMultipleToWebP`, `API_URL`
- Added imports: `uploadToCloudinary`, `deleteFromCloudinary`, `getPublicIdFromUrl`

**Functions Updated**:
- `uploadVehicle()`: Now uploads to Cloudinary folders (`4on4/vehicles`, `4on4/vehicles/documents`)
- `getVehiclesByUser()`: Simplified URL extraction (no baseUrl construction needed)
- `getVehicleById()`: Simplified URL extraction
- `updateVehicle()`: Uploads new images to Cloudinary, deletes removed images using publicId
- `deleteVehicleImage()`: Deletes from Cloudinary before removing from database
- `deleteVehicle()`: Deletes all associated Cloudinary images before removing record

### 4. Profile Controller Migrated
**File**: `src/controllers/profileController.js`

**Changes**:
- Removed imports: `convertToWebP`, `API_URL`
- Added imports: `uploadToCloudinary`, `deleteFromCloudinary`, `getPublicIdFromUrl`

**Functions Updated**:
- `serialize()`: Simplified to extract Cloudinary URLs directly
- `updateProfileAvatar()`: Now uploads to Cloudinary (`4on4/users`), deletes old avatar
- `applyProfileFields()`: Uploads all profile images to Cloudinary:
  - Profile pictures → `4on4/users`
  - ID images → `4on4/users/documents`
  - Passport images → `4on4/users/documents`
  - TRA images → `4on4/users/documents`

### 5. Environment Configuration
**File**: `.env`

Added Cloudinary credentials:
```env
CLOUDINARY_CLOUD_NAME=dogahiv53
CLOUDINARY_API_KEY=696493524999996
CLOUDINARY_API_SECRET=3y87hVwW-QOiRRivqvKJ012QJBU
API_URL=https://fouron4-backend-1.onrender.com
```

### 6. Dependencies Installed
**Package**: `cloudinary`

Installed via:
```bash
npm install cloudinary
```

## Benefits of Cloudinary Migration

1. **Permanent Storage**: Images persist across deployments and server restarts
2. **HTTPS URLs**: All images served over HTTPS, eliminating mixed content warnings
3. **Automatic WebP Conversion**: Cloudinary converts images to WebP format automatically
4. **CDN Delivery**: Images served via Cloudinary's global CDN for fast loading
5. **Organized Storage**: Images stored in organized folders:
   - `4on4/users` - Profile pictures
   - `4on4/users/documents` - ID, passport, TRA images
   - `4on4/vehicles` - Vehicle images
   - `4on4/vehicles/documents` - Vehicle documents
6. **Proper Deletion**: publicId tracking ensures images are deleted from Cloudinary when removed from database

## What's Next

### 1. Deploy to Render (CRITICAL)
⚠️ **IMPORTANT**: You must add the Cloudinary environment variables to your Render dashboard:

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your backend service: `fouron4-backend-1`
3. Go to **Environment** tab
4. Add these variables:
   ```
   CLOUDINARY_CLOUD_NAME=dogahiv53
   CLOUDINARY_API_KEY=696493524999996
   CLOUDINARY_API_SECRET=3y87hVwW-QOiRRivqvKJ012QJBU
   ```
5. Click **Save Changes**
6. Render will automatically redeploy your app

### 2. Test the Migration
After deployment:
1. Upload a new vehicle with images
2. Verify images appear correctly
3. Upload a new profile picture
4. Update a vehicle by adding/removing images
5. Delete a vehicle and verify Cloudinary images are removed
6. Check that images persist after a Render restart/redeploy

### 3. Database Migration (Optional)
Existing database records don't have `publicId` fields. You have two options:

**Option A**: Keep existing records as-is
- Old images won't be deletable from Cloudinary (but won't cause errors)
- New uploads will have publicId and be deletable

**Option B**: Add a migration script to extract publicIds from existing Cloudinary URLs
- More complex but ensures all images are properly tracked
- Required if you want to delete old images from Cloudinary

### 4. Cleanup Old Local Images (After Verification)
Once you've verified Cloudinary is working:
1. Existing local images in `uploads/` folder can be deleted
2. The `uploads/` folder is no longer needed (but can be kept as backup)

## Testing Checklist

- [ ] Backend deployed to Render with Cloudinary env vars
- [ ] Upload new vehicle with images
- [ ] Vehicle images display correctly on frontend
- [ ] Upload profile picture
- [ ] Profile picture displays correctly
- [ ] Update vehicle by adding images
- [ ] Update vehicle by removing images (verify deletion from Cloudinary)
- [ ] Delete vehicle (verify all images deleted from Cloudinary)
- [ ] Images persist after Render redeploy
- [ ] All images served over HTTPS (no mixed content warnings)

## Rollback Plan
If something goes wrong:
1. Revert the changes to `vehicleController.js` and `profileController.js`
2. Restore the old imports (`convertToWebP`, `convertMultipleToWebP`)
3. Remove Cloudinary env vars from Render
4. Redeploy

## Support
Cloudinary Account: dogahiv53
- Dashboard: https://console.cloudinary.com
- Documentation: https://cloudinary.com/documentation/node_integration

## Notes
- Local filesystem storage still works for development
- Cloudinary automatically converts images to WebP format
- Images are stored with folder structure for organization
- publicId is required for proper deletion from Cloudinary
- The old `imageConverter.js` utility is no longer used but can be kept for reference
