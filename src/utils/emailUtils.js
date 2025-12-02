// src/utils/emailUtils.js
const nodemailer = require("nodemailer");

// Create transporter (Gmail or SMTP)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ======================================================
   SEND VERIFICATION OTP (REGISTER)
======================================================= */
exports.sendVerificationEmail = async (email, code) => {
  try {
    await transporter.sendMail({
      from: `"4ON4" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your 4ON4 Verification Code",
      html: `
        <div style="font-size:16px;">
          <p>Your 4ON4 verification code is:</p>
          <h2 style="font-size:28px;letter-spacing:4px;">${code}</h2>
          <p>This code expires in <b>2 minutes</b>.</p>
        </div>
      `,
    });

    return true; // ⭐ VERY IMPORTANT!
  } catch (err) {
    console.error("Email sending error:", err);
    return false;
  }
};

/* ======================================================
   SEND RESET PASSWORD / RESET PIN EMAIL
======================================================= */
exports.sendResetPasswordEmail = async (email, link) => {
  try {
    await transporter.sendMail({
      from: `"4ON4" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset your 4ON4 PIN",
      html: `
        <div style="font-size:16px;">
          <p>You requested to reset your PIN.</p>
          <p>Click the link below:</p>
          <a href="${link}" style="font-size:18px;">Reset PIN</a>
          <p>This link expires in 1 hour.</p>
        </div>
      `,
    });

    return true; // ⭐ VERY IMPORTANT!
  } catch (err) {
    console.error("Reset email error:", err);
    return false;
  }
};
