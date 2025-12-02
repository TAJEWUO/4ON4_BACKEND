// src/utils/emailUtils.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendVerificationEmail = async (email, code) => {
  try {
    await transporter.sendMail({
      from: `"4ON4" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "4ON4 Email Verification Code",
      text: `Your verification code is: ${code}`,
      html: `<p>Your verification code is: <b>${code}</b></p>`,
    });

    return true; // ✔️ FIXED — ALWAYS return true on success
  } catch (err) {
    console.error("Email send ERROR:", err);
    return false; // ✔️ will trigger proper error
  }
};

exports.sendResetPasswordEmail = async (email, url) => {
  try {
    await transporter.sendMail({
      from: `"4ON4" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your 4ON4 Account PIN",
      text: `Reset your PIN using this link: ${url}`,
      html: `<p>Reset your PIN using this link:</p><a href="${url}">${url}</a>`,
    });

    return true; // ✔️ FIXED
  } catch (err) {
    console.error("Email send ERROR:", err);
    return false;
  }
};
