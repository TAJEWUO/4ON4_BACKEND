// src/middleware/upload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { UPLOAD_DIR } = require("../config/env");

// ensure directories
const vehiclesDir = path.join(process.cwd(), UPLOAD_DIR, "vehicles");
const usersDir = path.join(process.cwd(), UPLOAD_DIR, "users");
if (!fs.existsSync(vehiclesDir)) fs.mkdirSync(vehiclesDir, { recursive: true });
if (!fs.existsSync(usersDir)) fs.mkdirSync(usersDir, { recursive: true });

function makeStorageFor(dir) {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, dir);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, name);
    },
  });
}

function fileFilter(req, file, cb) {
  const allowedImages = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const allowedDocs = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if (allowedImages.includes(file.mimetype) || allowedDocs.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images (jpg/png/webp) and PDFs/DOCs are allowed."));
  }
}

// vehicle upload: images up to 3 + documents unlimited (or 6)
const vehicleStorage = makeStorageFor(vehiclesDir);
const uploadVehicle = multer({
  storage: vehicleStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

// user upload: profile image and ID/passport/TRA images
const userStorage = makeStorageFor(usersDir);
const uploadUser = multer({
  storage: userStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { uploadVehicle, uploadUser };
