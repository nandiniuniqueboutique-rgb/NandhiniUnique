// Two modes of WhatsApp integration:
//
// 1) SIMPLE MODE (works immediately, no signup needed):
//    We just build a "click to chat" wa.me link with the message pre-filled.
//    The frontend shows this as a button - clicking opens WhatsApp with the
//    message ready to send. This is how the customer "contacts via WhatsApp"
//    and how the owner can quickly message a customer about their order.
//
// 2) ADVANCED MODE (optional, needs a free Twilio account):
//    If TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are set in backend/.env, the
//    server will automatically SEND a WhatsApp message to the customer the
//    moment the owner updates an order's status - no click needed on the
//    owner's side. Run `npm install twilio` in backend/ first, then fill in
//    the .env values. See backend/.env.example for details.

function buildWaLink(phone, message) {
  const clean = String(phone || "").replace(/[^\d]/g, "");
  const text = encodeURIComponent(message || "");
  return `https://wa.me/${clean}?text=${text}`;
}

async function sendWhatsAppMessage(toPhone, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token) {
    // Advanced mode not configured - caller should fall back to showing a wa.me link instead.
    return { sent: false, mode: "simple", link: buildWaLink(toPhone, message) };
  }

  try {
    // eslint-disable-next-line global-require
    const twilio = require("twilio");
    const client = twilio(sid, token);
    const clean = String(toPhone || "").replace(/[^\d]/g, "");
    await client.messages.create({
      from,
      to: `whatsapp:+${clean}`,
      body: message,
    });
    return { sent: true, mode: "twilio" };
  } catch (err) {
    console.error("WhatsApp (Twilio) send failed, falling back to link:", err.message);
    return { sent: false, mode: "simple", link: buildWaLink(toPhone, message), error: err.message };
  }
}

module.exports = { buildWaLink, sendWhatsAppMessage };
