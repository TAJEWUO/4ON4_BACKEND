// src/utils/emailUtils.js
const axios = require("axios");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || "support@4on4.world";
const FROM_NAME = process.env.FROM_NAME || "4ON4";

if (!RESEND_API_KEY) {
  console.warn(
    "[emailUtils] RESEND_API_KEY is missing. Emails will fail until this is set."
  );
}

// Generic helper to call Resend API
async function sendResendEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    console.error("Resend API key not configured");
    return false;
  }

  try {
    const from = `${FROM_NAME} <${MAIL_FROM}>`;

    const res = await axios.post(
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
        timeout: 15000, // 15s timeout to avoid hanging forever
      }
    );

    // If Resend returns an id, we consider it success
    if (res.data && res.data.id) {
      return true;
    }

    console.error("Resend response did not include id:", res.data);
    return false;
  } catch (err) {
    console.error("Email send ERROR (Resend):", err.response?.data || err.message);
    return false;
  }
}

/**
 * Send verification email for REGISTER
 */
exports.sendVerificationEmail = async (email, code) => {
  const subject = "4ON4 Email Verification Code";
  const text = `Your verification code is: ${code}`;
  const html = `
    <p>Your verification code is:</p>
    <p style="font-size: 22px; font-weight: bold; letter-spacing: 4px;">
      ${code}
    </p>
    <p>This code will expire in 2 minutes.</p>
  `;

  return sendResendEmail({ to: email, subject, html, text });
};

/**
 * Send reset PIN email
 */
exports.sendResetPasswordEmail = async (email, url) => {
  const subject = "Reset Your 4ON4 Account PIN";
  const text = `Reset your PIN using this link: ${url}`;
  const html = `
    <p>Reset your PIN using this link:</p>
    <p><a href="${url}" target="_blank">${url}</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  return sendResendEmail({ to: email, subject, html, text });
};
