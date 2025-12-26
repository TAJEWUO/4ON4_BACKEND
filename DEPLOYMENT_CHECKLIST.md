# Cloudinary Migration - Deployment Checklist

## ✅ Completed (Local Development)

- [x] Installed `cloudinary` npm package
- [x] Created `src/services/cloudinaryService.js`
- [x] Updated `src/models/Vehicle.js` with publicId field
- [x] Updated `src/models/UserProfile.js` with publicId field
- [x] Migrated `src/controllers/vehicleController.js` to use Cloudinary
- [x] Migrated `src/controllers/profileController.js` to use Cloudinary
- [x] Added Cloudinary credentials to `.env`
- [x] Verified no syntax errors in code

## 🔲 Pending (Production Deployment)

### Critical - Must Do Now

- [ ] **Add Cloudinary environment variables to Render**
  - [ ] Login to https://dashboard.render.com
  - [ ] Select service: fouron4-backend-1
  - [ ] Go to Environment tab
  - [ ] Add: `CLOUDINARY_CLOUD_NAME=dogahiv53`
  - [ ] Add: `CLOUDINARY_API_KEY=696493524999996`
  - [ ] Add: `CLOUDINARY_API_SECRET=3y87hVwW-QOiRRivqvKJ012QJBU`
  - [ ] Click Save Changes
  - [ ] Wait for automatic redeploy (2-5 mins)

### Testing After Deployment

- [ ] **Test Vehicle Image Upload**
  - [ ] Create a new vehicle with images
  - [ ] Verify images display on frontend
  - [ ] Check browser console for errors
  - [ ] Verify image URLs start with `https://res.cloudinary.com`

- [ ] **Test Profile Image Upload**
  - [ ] Upload a profile picture
  - [ ] Verify it displays on frontend
  - [ ] Check image URL is HTTPS

- [ ] **Test Image Update**
  - [ ] Edit a vehicle and add new images
  - [ ] Remove an image from a vehicle
  - [ ] Verify Cloudinary deletes old images

- [ ] **Test Image Persistence**
  - [ ] Upload images
  - [ ] Wait 10 minutes
  - [ ] Check if images still display (they should!)
  - [ ] Trigger a Render redeploy
  - [ ] Verify images still display after redeploy

- [ ] **Test Image Deletion**
  - [ ] Delete a vehicle
  - [ ] Login to Cloudinary console
  - [ ] Verify images were deleted from Cloudinary

### Optional - Future Improvements

- [ ] Add migration script for existing database records
- [ ] Add image optimization settings in Cloudinary
- [ ] Set up Cloudinary transformations for thumbnails
- [ ] Configure Cloudinary backup/versioning
- [ ] Clean up old local images in `uploads/` folder

## Quick Links

- **Render Dashboard**: https://dashboard.render.com
- **Cloudinary Console**: https://console.cloudinary.com
- **Frontend**: https://4on4.site
- **Backend API**: https://fouron4-backend-1.onrender.com

## Help Files

- Full details: [CLOUDINARY_MIGRATION_SUMMARY.md](./CLOUDINARY_MIGRATION_SUMMARY.md)
- Quick setup: [RENDER_SETUP_GUIDE.md](./RENDER_SETUP_GUIDE.md)

## Status
Last Updated: ${new Date().toISOString()}
Migration Status: ✅ Code Complete | ⏳ Awaiting Production Deployment
