const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "profileImage" || file.fieldname === "profileDocs") {
      cb(null, path.join("src", "uploads", "drivers"));
    } else if (file.fieldname === "images") {
      cb(null, path.join("src", "uploads", "vehicles"));
    } else {
      cb(null, path.join("src", "uploads"));
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

module.exports = multer({ storage });
