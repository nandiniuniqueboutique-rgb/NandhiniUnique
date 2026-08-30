const express = require("express");
const Offer = require("../models/Offer");
const { protect, adminOnly } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// GET /api/offers - active offers visible to customers
router.get("/", async (req, res) => {
  const now = new Date();
  const offers = await Offer.find({
    isActive: true,
    validFrom: { $lte: now },
    $or: [{ validTill: null }, { validTill: { $gte: now } }],
  }).sort({ createdAt: -1 });
  res.json({ offers });
});

// GET /api/offers/admin/all
router.get("/admin/all", protect, adminOnly, async (req, res) => {
  const offers = await Offer.find().sort({ createdAt: -1 });
  res.json({ offers });
});

// POST /api/offers/validate/:code - check a coupon code at checkout
router.get("/validate/:code", async (req, res) => {
  const now = new Date();
  const offer = await Offer.findOne({
    code: req.params.code.toUpperCase(),
    isActive: true,
    validFrom: { $lte: now },
    $or: [{ validTill: null }, { validTill: { $gte: now } }],
  });
  if (!offer) return res.status(404).json({ message: "This offer code is invalid or has expired" });
  res.json({ offer });
});

// POST /api/offers - owner creates a new offer/discount
router.post("/", protect, adminOnly, upload.single("image"), async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.file) body.image = `/uploads/${req.file.filename}`;
    const offer = await Offer.create(body);
    res.status(201).json({ offer });
  } catch (err) {
    res.status(400).json({ message: "Could not create offer", error: err.message });
  }
});

// PUT /api/offers/:id
router.put("/:id", protect, adminOnly, upload.single("image"), async (req, res) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) return res.status(404).json({ message: "Offer not found" });
  const body = { ...req.body };
  if (req.file) body.image = `/uploads/${req.file.filename}`;
  Object.assign(offer, body);
  await offer.save();
  res.json({ offer });
});

// DELETE /api/offers/:id
router.delete("/:id", protect, adminOnly, async (req, res) => {
  await Offer.findByIdAndDelete(req.params.id);
  res.json({ message: "Offer deleted" });
});

module.exports = router;
