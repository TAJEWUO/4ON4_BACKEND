const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  identifier: { type: String, required: true, unique: true }, // phone or email
  password: { type: String, required: true },

  // Driver profile details
  firstName: String,
  lastName: String,

  phone: String,
  email: String,

  citizenship: String,
  level: String,
  licenseNumber: String,
  nationalId: String,
  languages: [String],

  profileImage: String,
  profileDocuments: [String],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", UserSchema);
