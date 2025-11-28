const User = require("../models/User");
const jwt = require("jsonwebtoken");

const makeToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

exports.registerUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const exists = await User.findOne({ identifier });
    if (exists) {
      return res.status(400).json({ success: false, message: "Account already exists" });
    }

    const user = await User.create({ identifier, password });

    return res.json({
      success: true,
      message: "Account created",
      user,
      token: makeToken(user._id)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({ identifier });
    if (!user || user.password !== password) {
      return res.status(400).json({ success: false, message: "Invalid login" });
    }

    return res.json({
      success: true,
      message: "Login successful",
      user,
      token: makeToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { identifier, newPassword } = req.body;

    const user = await User.findOne({ identifier });
    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    user.password = newPassword;
    await user.save();

    return res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
