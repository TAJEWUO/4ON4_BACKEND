// src/utils/emailUtils.js
const axios = require("axios");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || "support@4on4.world";
const FROM_NAME = process.env.FROM_NAME || "4ON4";

if (!RESEND_API_KEY) {
  console.warn("[emailUtils] RESEND_API_KEY missing — emails cannot send.");
}

// INTERNAL helper
async function sendResendEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) return false;

  try {
    const from = `${FROM_NAME} <${MAIL_FROM}>`;

    const response = await axios.post(
      "https://api.resend.com/emails",
      {
        from,
        to,
        subject,
        html,
        text,
      },
      {
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    return Boolean(response.data?.id);
  } catch (err) {
    console.error("Email send ERROR:", err.response?.data || err.message);
    return false;
  }
}

// REGISTER OTP EMAIL
exports.sendVerificationEmail = async (email, code) => {
  return sendResendEmail({
    to: email,
    subject: "4ON4 Email Verification Code",
    text: `Your verification code is: ${code}`,
    html: `
      <p>Your verification code is:</p>
      <h2>${code}</h2>
      <p>Expires in 2 minutes.</p>
    `,
  });
};

// RESET PIN EMAIL
exports.sendResetPasswordEmail = async (email, url) => {
  return sendResendEmail({
    to: email,
    subject: "Reset Your 4ON4 Account PIN",
    text: `Reset your PIN using: ${url}`,
    html: `
      <p>Reset your PIN:</p>
      <a href="${url}" target="_blank">${url}</a>
    `,
  });
};
