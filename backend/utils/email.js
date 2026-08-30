const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

// Sends an email. Silently logs to console instead of throwing if SMTP isn't configured yet,
// so the rest of the app keeps working during local development / demoing.
async function sendMail({ to, subject, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[email disabled - no SMTP configured] Would send to ${to}: ${subject}`);
    return { simulated: true };
  }
  try {
    await t.sendMail({ from: `"Nandini Unique" <${process.env.SMTP_USER}>`, to, subject, html });
    return { sent: true };
  } catch (err) {
    console.error("Email send failed:", err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendMail };
