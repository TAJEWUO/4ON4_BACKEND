// src/utils/emailUtils.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send OTP for registration
exports.sendVerificationEmail = async (email, code) => {
  try {
    await transporter.sendMail({
      from: `"4ON4" <${process.env.MAIL_FROM}>`,
      to: email,
      subject: "4ON4 Email Verification Code",
      text: `Your verification code is: ${code}`,
      html: `
        <p>Your verification code is:</p>
        <p style="font-size: 22px; font-weight: bold; letter-spacing: 4px;">
          ${code}
        </p>
        <p>This OTP expires in 2 minutes.</p>
      `,
    });

    return true;
  } catch (err) {
    console.error("Email send ERROR:", err);
    return false;
  }
};

// Send reset link
exports.sendResetPasswordEmail = async (email, url) => {
  try {
    await transporter.sendMail({
      from: `"4ON4" <${process.env.MAIL_FROM}>`,
      to: email,
      subject: "Reset Your 4ON4 Account PIN",
      text: `Reset your PIN using this link: ${url}`,
      html: `
        <p>Reset your PIN using this link:</p>
        <p><a href="${url}" target="_blank">${url}</a></p>
        <p>If you did not request this, you can ignore this message.</p>
      `,
    });

    return true;
  } catch (err) {
    console.error("Email send ERROR:", err);
    return false;
  }
};
