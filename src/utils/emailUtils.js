const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.MAIL_FROM;

exports.sendVerificationEmail = async (email, url) => {
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Verify your 4ON4 account",
      html: `
        <h2>4ON4 Account Verification</h2>
        <p>Click the link below to verify your email:</p>
        <a href="${url}" style="color:blue">${url}</a>
        <p>This link expires in 1 hour.</p>
      `,
    });
    console.log("Verification email sent");
  } catch (err) {
    console.error("Email sending failed:", err);
    throw err;
  }
};

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
    console.log("Reset email sent");
  } catch (err) {
    console.error("Email sending failed:", err);
    throw err;
  }
};
