const express = require("express");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/auth");
const { sendMail } = require("../utils/email");
const { sendWhatsAppMessage, buildWaLink } = require("../utils/whatsapp");

const router = express.Router();

// POST /api/orders - place a new order (customer, logged in)
// NOTE ON PAYMENTS: this starter uses a manual UPI/Bank-transfer flow - the customer pays via
// the UPI QR code / bank details shown at checkout, then enters the UTR / transaction ID here.
// The owner verifies it from the admin panel before shipping. To switch to instant online
// payments later, integrate Razorpay's Checkout on the frontend and, in this route, verify the
// signature Razorpay sends back before marking payment.status = "Verified" automatically.
router.post("/", protect, async (req, res) => {
  try {
    const { items, shippingAddress, payment, couponCode, discountAmount, shippingFee } = req.body;
    if (!items || !items.length) return res.status(400).json({ message: "Your cart is empty" });

    // Recalculate prices server-side from the database so a tampered request can't change totals
    let itemsTotal = 0;
    const finalItems = [];
    for (const it of items) {
      const product = await Product.findById(it.product);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: `A saree in your cart is no longer available` });
      }
      const price = product.priceForSize(it.size);
      itemsTotal += price * it.quantity;
      finalItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0] || "",
        size: it.size,
        quantity: it.quantity,
        price,
      });
    }

    const total = Math.max(0, itemsTotal + (shippingFee || 0) - (discountAmount || 0));

    const order = await Order.create({
      user: req.user._id,
      items: finalItems,
      shippingAddress,
      itemsTotal,
      shippingFee: shippingFee || 0,
      discountAmount: discountAmount || 0,
      totalAmount: total,
      couponCode: couponCode || "",
      payment: {
        method: payment?.method || "UPI",
        transactionId: payment?.transactionId || "",
        status: payment?.transactionId ? "Pending" : "Pending",
      },
      statusHistory: [{ status: "Placed", note: "Order placed by customer" }],
    });

    sendMail({
      to: req.user.email,
      subject: `Order Confirmed - Nandini Unique (#${order._id.toString().slice(-6).toUpperCase()})`,
      html: `<p>Hi ${req.user.name},</p><p>Thank you for shopping with Nandini Unique! Your order <b>#${order._id
        .toString()
        .slice(-6)
        .toUpperCase()}</b> for ₹${total} has been placed and is being reviewed.</p><p>You can track it anytime from "My Orders".</p>`,
    });

    res.status(201).json({ order });
  } catch (err) {
    res.status(500).json({ message: "Could not place order", error: err.message });
  }
});

// GET /api/orders/track/:id?phone=... - public order tracking (no login needed), like a
// courier tracking page. Requires the phone number on the order to match, as a basic check.
router.get("/track/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "We couldn't find an order with that ID" });

    const phone = String(req.query.phone || "").replace(/[^\d]/g, "");
    const orderPhone = String(order.shippingAddress?.phone || "").replace(/[^\d]/g, "");
    if (!phone || !orderPhone.endsWith(phone.slice(-10)) ) {
      return res.status(403).json({ message: "The phone number doesn't match this order. Please check and try again." });
    }

    res.json({ order });
  } catch (err) {
    res.status(404).json({ message: "We couldn't find an order with that ID" });
  }
});

// GET /api/orders/my - logged-in customer's own order history
router.get("/my", protect, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ orders });
});

// GET /api/orders/admin/all - owner sees every order
router.get("/admin/all", protect, adminOnly, async (req, res) => {
  const { status } = req.query;
  const filter = status ? { orderStatus: status } : {};
  const orders = await Order.find(filter).populate("user", "name email phone").sort({ createdAt: -1 });
  res.json({ orders });
});

// GET /api/orders/:id - single order detail (owner of the order, or admin)
router.get("/:id", protect, async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email phone");
  if (!order) return res.status(404).json({ message: "Order not found" });
  const isOwner = order.user._id.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") return res.status(403).json({ message: "Not your order" });
  res.json({ order });
});

// PUT /api/orders/:id/status - admin updates order status (placed/shipped/delivered/etc)
// and notifies the customer over WhatsApp (auto-send if Twilio is configured, otherwise
// returns a wa.me link the admin panel can open) as well as email.
router.put("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { status, note, trackingNote } = req.body;
    const order = await Order.findById(req.params.id).populate("user", "name email phone");
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.orderStatus = status;
    if (trackingNote !== undefined) order.trackingNote = trackingNote;
    order.statusHistory.push({ status, note: note || "" });
    await order.save();

    const shortId = order._id.toString().slice(-6).toUpperCase();
    const message = `Hi ${order.user.name}, your Nandini Unique order #${shortId} is now: *${status}*.${
      trackingNote ? " " + trackingNote : ""
    } Thank you for shopping with us!`;

    const waResult = await sendWhatsAppMessage(order.user.phone, message);
    order.whatsappUpdatesSent.push({ status, at: new Date() });
    await order.save();

    sendMail({
      to: order.user.email,
      subject: `Order #${shortId} update: ${status}`,
      html: `<p>${message}</p>`,
    });

    res.json({ order, whatsapp: waResult });
  } catch (err) {
    res.status(500).json({ message: "Could not update order", error: err.message });
  }
});

// PUT /api/orders/:id/payment - admin verifies a UTR/transaction ID against the payment received
router.put("/:id/payment", protect, adminOnly, async (req, res) => {
  const { status, transactionId } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  if (transactionId !== undefined) order.payment.transactionId = transactionId;
  if (status) {
    order.payment.status = status;
    if (status === "Verified") order.payment.paidAt = new Date();
  }
  await order.save();
  res.json({ order });
});

// PUT /api/orders/:id/cancel - customer cancels their own order while it's still early stage
router.put("/:id/cancel", protect, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not your order" });
  if (["Shipped", "Out for Delivery", "Delivered"].includes(order.orderStatus)) {
    return res.status(400).json({ message: "This order has already shipped and can no longer be cancelled online. Please contact us." });
  }
  order.orderStatus = "Cancelled";
  order.statusHistory.push({ status: "Cancelled", note: "Cancelled by customer" });
  await order.save();
  res.json({ order });
});

module.exports = router;
