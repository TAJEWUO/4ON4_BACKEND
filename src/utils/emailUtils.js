const nodemailer = require('nodemailer');

// Configure email service (using Gmail as example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendOTPEmail = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🔐 Your Verification Code',
      html: `
        <h2>Verify Your Email</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #007bff; letter-spacing: 2px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });
    console.log(`✅ OTP sent to ${email}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
};

module.exports = { sendOTPEmail };