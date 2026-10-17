// Razorpay online payments (UPI, cards, netbanking, wallets).
//
// Flow:
//   1. Checkout creates the order            POST /api/orders              (method "Card/Online")
//   2. Checkout asks for a Razorpay order    POST /api/payments/razorpay/create
//   3. Customer pays in Razorpay's popup
//   4. Checkout sends back the signature     POST /api/payments/razorpay/verify
//   5. Razorpay also calls our webhook       POST /api/payments/razorpay/webhook
//      so the order is marked paid even if the customer closes the tab after paying.
//
// Settings (Render -> Environment):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
// The amount is always taken from the order stored in our database, never from the browser.

const express = require("express");
const crypto = require("crypto");
const Order = require("../models/Order");
const { protect } = require("../middleware/auth");
const { sendMail } = require("../utils/email");

const router = express.Router();
const RZP_API = "https://api.razorpay.com/v1";

function getKeys() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  return id && secret ? { id, secret } : null;
}

function safeEqual(a, b) {
  const A = Buffer.from(String(a || ""), "utf8");
  const B = Buffer.from(String(b || ""), "utf8");
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

function hmac(secret, data) {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

async function rzp(path, options = {}) {
  const k = getKeys();
  const res = await fetch(RZP_API + path, {
    ...options,
    headers: {
      Authorization: "Basic " + Buffer.from(`${k.id}:${k.secret}`).toString("base64"),
      "Content-Type": "application/json",
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && data.error && data.error.description) || `Razorpay error ${res.status}`);
  return data;
}

// Marks the order paid exactly once (safe if verify and the webhook both arrive).
async function markPaid(orderId, razorpayPaymentId, note) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, "payment.status": { $ne: "Verified" } },
    {
      $set: {
        "payment.status": "Verified",
        "payment.paidAt": new Date(),
        "payment.razorpayPaymentId": razorpayPaymentId,
        "payment.transactionId": razorpayPaymentId,
      },
      $push: { statusHistory: { status: "Placed", note } },
    },
    { new: true }
  ).populate("user", "name email phone");

  if (order) {
    const shortId = order._id.toString().slice(-6).toUpperCase();
    sendMail({
      to: order.user.email,
      subject: `Payment received - Nandini Unique (#${shortId})`,
      html: `<p>Hi ${order.user.name},</p><p>We received your payment of ₹${order.totalAmount} for order <b>#${shortId}</b>. Thank you for shopping with Nandini Unique! Your order is now being prepared.</p><p>You can track it anytime from "My Orders".</p>`,
    });
  }
  return order; // null when it was already marked paid
}

async function loadOwnOrder(req, res) {
  let order = null;
  try {
    order = await Order.findById(req.body.orderId);
  } catch (e) {
    /* bad id */
  }
  if (!order || order.user.toString() !== req.user._id.toString()) {
    res.status(404).json({ message: "Order not found" });
    return null;
  }
  return order;
}

// POST /api/payments/razorpay/create  { orderId }
router.post("/razorpay/create", protect, async (req, res) => {
  try {
    if (!getKeys()) {
      return res.status(503).json({ message: "Online payment is not available right now. Please choose another payment method." });
    }
    const order = await loadOwnOrder(req, res);
    if (!order) return;

    if (order.payment.method !== "Card/Online") return res.status(400).json({ message: "This order is not an online-payment order" });
    if (order.payment.status === "Verified") return res.status(400).json({ message: "This order is already paid" });
    if (order.orderStatus === "Cancelled") return res.status(400).json({ message: "This order was cancelled" });

    const amount = Math.round(order.totalAmount * 100); // paise
    if (amount < 100) return res.status(400).json({ message: "Order amount is too small for online payment" });

    // Reuse the Razorpay order from an earlier attempt if it is still open and the amount matches
    let rzpOrderId = order.payment.razorpayOrderId;
    if (rzpOrderId) {
      try {
        const existing = await rzp(`/orders/${rzpOrderId}`);
        if (existing.status === "paid") return res.status(400).json({ message: "This order is already paid" });
        if (existing.amount !== amount) rzpOrderId = "";
      } catch (e) {
        rzpOrderId = "";
      }
    }
    if (!rzpOrderId) {
      const created = await rzp("/orders", {
        method: "POST",
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: order._id.toString(),
          notes: { orderId: order._id.toString() },
        }),
      });
      rzpOrderId = created.id;
      order.payment.razorpayOrderId = rzpOrderId;
      await order.save();
    }

    res.json({
      keyId: getKeys().id,
      razorpayOrderId: rzpOrderId,
      amount,
      currency: "INR",
      shortId: order._id.toString().slice(-6).toUpperCase(),
    });
  } catch (err) {
    console.error("Razorpay create failed:", err.message);
    res.status(502).json({ message: "Could not start the payment. Please try again.", error: err.message });
  }
});

// POST /api/payments/razorpay/verify  { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
router.post("/razorpay/verify", protect, async (req, res) => {
  try {
    const keys = getKeys();
    if (!keys) return res.status(503).json({ message: "Online payment is not available right now." });
    const order = await loadOwnOrder(req, res);
    if (!order) return;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment details" });
    }
    if (!order.payment.razorpayOrderId || order.payment.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ message: "This payment does not belong to this order" });
    }

    const expected = hmac(keys.secret, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (!safeEqual(expected, razorpay_signature)) {
      console.warn("Razorpay signature mismatch for order", order._id.toString());
      return res.status(400).json({ message: "Payment could not be verified. If money was deducted, contact us with your order number." });
    }

    await markPaid(order._id, razorpay_payment_id, "Online payment received");
    res.json({ ok: true, orderId: order._id });
  } catch (err) {
    console.error("Razorpay verify failed:", err.message);
    res.status(500).json({ message: "Could not confirm the payment", error: err.message });
  }
});

// POST /api/payments/razorpay/webhook  (called by Razorpay, no login)
// In Razorpay Dashboard -> Webhooks: URL = https://<your-api>/api/payments/razorpay/webhook,
// events = payment.captured and order.paid, secret = RAZORPAY_WEBHOOK_SECRET.
router.post("/razorpay/webhook", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ message: "Webhook not configured" });

    const signature = req.get("x-razorpay-signature");
    const raw = req.rawBody; // set in server.js
    if (!signature || !raw) return res.status(400).json({ message: "Bad request" });
    if (!safeEqual(hmac(secret, raw), signature)) return res.status(400).json({ message: "Invalid signature" });

    const event = req.body && req.body.event;
    if (event === "payment.captured" || event === "order.paid") {
      const payment = req.body.payload && req.body.payload.payment && req.body.payload.payment.entity;
      if (payment && payment.id) {
        let order = payment.order_id ? await Order.findOne({ "payment.razorpayOrderId": payment.order_id }) : null;
        if (!order && payment.notes && payment.notes.orderId) {
          try {
            order = await Order.findById(payment.notes.orderId);
          } catch (e) {
            /* ignore */
          }
        }
        if (order) {
          if (payment.amount === Math.round(order.totalAmount * 100)) {
            await markPaid(order._id, payment.id, "Online payment confirmed by Razorpay");
          } else {
            console.warn("Razorpay webhook amount mismatch for order", order._id.toString());
          }
        }
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Razorpay webhook error:", err.message);
    res.status(500).json({ message: "Webhook error" });
  }
});

module.exports = router;
