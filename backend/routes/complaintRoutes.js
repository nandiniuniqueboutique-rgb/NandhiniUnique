const express = require("express");
const Complaint = require("../models/Complaint");
const { protect, adminOnly } = require("../middleware/auth");
const { sendMail } = require("../utils/email");
const { buildWaLink } = require("../utils/whatsapp");

const router = express.Router();

// POST /api/complaints - raise a query/complaint (works for logged-in customers or guests)
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, order, type, subject, message, contactPreference } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "Name, email, subject and message are required" });
    }

    const complaint = await Complaint.create({
      user: req.user ? req.user._id : undefined,
      name,
      email,
      phone,
      order: order || undefined,
      type,
      subject,
      message,
      contactPreference,
    });

    sendMail({
      to: process.env.STORE_EMAIL || process.env.SMTP_USER,
      subject: `New ${type || "Query"} from ${name}: ${subject}`,
      html: `<p><b>From:</b> ${name} (${email}, ${phone || "no phone given"})</p><p><b>Message:</b> ${message}</p>`,
    });

    const waLink = buildWaLink(
      process.env.STORE_WHATSAPP_NUMBER,
      `New ${type || "query"} from ${name}: ${subject} - ${message}`
    );

    res.status(201).json({ complaint, waLink });
  } catch (err) {
    res.status(500).json({ message: "Could not submit your message", error: err.message });
  }
});

// GET /api/complaints/my - a customer's own past queries (if logged in)
router.get("/my", protect, async (req, res) => {
  const complaints = await Complaint.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ complaints });
});

// GET /api/complaints/admin/all - owner's support inbox
router.get("/admin/all", protect, adminOnly, async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
  res.json({ complaints });
});

// PUT /api/complaints/:id - owner replies / updates status
router.put("/:id", protect, adminOnly, async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ message: "Not found" });

  const { status, reply } = req.body;
  if (status) complaint.status = status;
  if (reply !== undefined) complaint.reply = reply;
  await complaint.save();

  if (reply) {
    sendMail({
      to: complaint.email,
      subject: `Re: ${complaint.subject} - Nandini Unique`,
      html: `<p>Hi ${complaint.name},</p><p>${reply}</p><p>- Team Nandini Unique</p>`,
    });
  }

  res.json({ complaint });
});

module.exports = router;
