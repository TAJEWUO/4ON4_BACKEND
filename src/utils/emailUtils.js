// src/utils/emailUtils.js
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.MAIL_FROM; // e.g. "4ON4 Support <support@4on4.world>"

// 1) EMAIL VERIFICATION – 6 DIGIT CODE
exports.sendVerificationEmail = async (email, code) => {
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Your 4ON4 verification code",
      html: `
        <h2>4ON4 Email Verification</h2>
        <p>Your verification code is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">
          ${code}
        </p>
        <p>This code expires in <strong>1 minute</strong>.</p>
      `,
    });
    console.log("Verification code email sent to", email);
  } catch (err) {
    console.error("Email sending failed:", err);
    throw err;
  }
};

// 2) RESET PASSWORD – still link based
exports.sendResetPasswordEmail = async (email, url) => {
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Reset your 4ON4 password",
      html: `
        <h2>4ON4 Password Reset</h2>
        <p>Click below to reset your password:</p>
        <a href="${url}" style="color:blue">${url}</a>
        <p>This link expires in 1 hour.</p>
      `,
    });
    console.log("Reset email sent to", email);
  } catch (err) {
    console.error("Email sending failed:", err);
    throw err;
  }
};
