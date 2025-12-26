# Quick Guide: Add Cloudinary to Render

## Step-by-Step Instructions

### 1. Login to Render
Go to: https://dashboard.render.com

### 2. Select Your Service
Find and click on: **fouron4-backend-1**

### 3. Go to Environment Tab
Click on the **Environment** tab in the left sidebar

### 4. Add Environment Variables
Click **Add Environment Variable** and add these three variables:

**Variable 1:**
- Key: `CLOUDINARY_CLOUD_NAME`
- Value: `dogahiv53`

**Variable 2:**
- Key: `CLOUDINARY_API_KEY`
- Value: `696493524999996`

**Variable 3:**
- Key: `CLOUDINARY_API_SECRET`
- Value: `3y87hVwW-QOiRRivqvKJ012QJBU`

### 5. Save Changes
Click **Save Changes** button

### 6. Wait for Redeploy
Render will automatically redeploy your application (this takes 2-5 minutes)

### 7. Test
Once deployed, test by:
1. Uploading a new vehicle with images
2. Checking if images appear on the frontend
3. Verifying images persist after waiting a few minutes

## Expected Result
✅ Images will be stored in Cloudinary
✅ Images will have HTTPS URLs
✅ Images will persist across deployments
✅ No more "mixed content" warnings

## Troubleshooting
If images still don't appear:
1. Check Render logs for errors: https://dashboard.render.com (Logs tab)
2. Verify all three env vars are set correctly
3. Check Cloudinary dashboard: https://console.cloudinary.com

## Need Help?
Check the full migration guide: `CLOUDINARY_MIGRATION_SUMMARY.md`
