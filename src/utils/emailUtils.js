// src/utils/emailUtils.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// For future OTP (keep it if already in use)
const sendOTPEmail = async (email, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your verification code",
    html: `
      <h2>Verify Your Email</h2>
      <p>Your verification code is:</p>
      <h1 style="color: #007bff; letter-spacing: 2px;">${otp}</h1>
      <p>This code expires in 10 minutes.</p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
};

// New: verification link for registration
const sendVerificationEmail = async (email, verifyUrl) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify your 4ON4 account",
    html: `
      <h2>Verify Your 4ON4 Account</h2>
      <p>Click the button below to verify your email and continue creating your account:</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:4px;">Verify Email</a></p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${verifyUrl}</p>
    `,
  });
};

// New: reset password link
const sendResetPasswordEmail = async (email, resetUrl) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Reset your 4ON4 password",
    html: `
      <h2>Reset Your Password</h2>
      <p>Click the button below to set a new password:</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:4px;">Reset Password</a></p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${resetUrl}</p>
    `,
  });
};

module.exports = { sendOTPEmail, sendVerificationEmail, sendResetPasswordEmail };
