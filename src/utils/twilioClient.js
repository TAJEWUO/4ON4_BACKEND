// src/utils/twilioClient.js
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

if (!accountSid || !authToken || !verifySid) {
  console.error("❌ Twilio configuration missing in .env");
}

const client = twilio(accountSid, authToken);

module.exports = { client, verifySid };
