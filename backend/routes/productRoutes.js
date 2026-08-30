const express = require("express");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// GET /api/products - public catalog with basic filtering + search
router.get("/", async (req, res) => {
  try {
    const { q, category, type, minPrice, maxPrice, featured, sort } = req.query;
    const filter = { isActive: true };

    if (q) filter.name = { $regex: q, $options: "i" };
    // Category is free text now, so match it as a partial/case-insensitive search
    // rather than an exact value - "silk" should still find "Pure Silk", "Kanjivaram Silk", etc.
    if (category) filter.category = { $regex: category, $options: "i" };
    if (type) filter.productType = type;
    if (featured === "true") filter.isFeatured = true;
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = Number(minPrice);
      if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }

    let query = Product.find(filter);
    if (sort === "price_asc") query = query.sort({ basePrice: 1 });
    else if (sort === "price_desc") query = query.sort({ basePrice: -1 });
    else query = query.sort({ createdAt: -1 });

    const products = await query;
    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: "Could not load products", error: err.message });
  }
});

// GET /api/products/meta/categories - distinct category names already used, so the admin
// form and shop filter can suggest them without restricting the seller to a fixed list
router.get("/meta/categories", async (req, res) => {
  try {
    const categories = await Product.distinct("category", { category: { $ne: "" } });
    res.json({ categories: categories.filter(Boolean).sort() });
  } catch (err) {
    res.status(500).json({ message: "Could not load categories", error: err.message });
  }
});

// GET /api/products/admin/all - includes inactive/sold-out items, admin only
router.get("/admin/all", protect, adminOnly, async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json({ products });
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Saree not found" });
    res.json({ product });
  } catch (err) {
    res.status(404).json({ message: "Saree not found" });
  }
});

// POST /api/products - create new saree listing (admin), up to 6 images
router.post("/", protect, adminOnly, upload.array("images", 6), async (req, res) => {
  try {
    const body = { ...req.body };

    ["sizeOptions", "attributes"].forEach((field) => {
      if (typeof body[field] === "string" && body[field].length) {
        try {
          body[field] = JSON.parse(body[field]);
        } catch {
          /* leave as-is, will fail validation below if malformed */
        }
      }
    });

    if (req.files && req.files.length) {
      body.images = req.files.map((f) => `/uploads/${f.filename}`);
    }

    const product = await Product.create(body);
    res.status(201).json({ product });
  } catch (err) {
    res.status(400).json({ message: "Could not create listing", error: err.message });
  }
});

// PUT /api/products/:id - edit details, price, stock, add more photos later
router.put("/:id", protect, adminOnly, upload.array("images", 6), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Saree not found" });

    const body = { ...req.body };
    ["sizeOptions", "attributes", "existingImages"].forEach((field) => {
      if (typeof body[field] === "string" && body[field].length) {
        try {
          body[field] = JSON.parse(body[field]);
        } catch {
          delete body[field];
        }
      }
    });

    // Images already kept by the seller (existing ones they didn't remove), plus any newly
    // uploaded files this request. This lets the admin panel remove individual photos.
    const baseImages = Array.isArray(body.existingImages) ? body.existingImages : product.images;
    const newImages = req.files && req.files.length ? req.files.map((f) => `/uploads/${f.filename}`) : [];
    body.images = [...baseImages, ...newImages];
    delete body.existingImages;

    Object.assign(product, body);
    await product.save();
    res.json({ product });
  } catch (err) {
    res.status(400).json({ message: "Could not update listing", error: err.message });
  }
});

// DELETE /api/products/:id - retire a design (soft delete keeps past orders intact)
router.delete("/:id", protect, adminOnly, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Saree not found" });
  product.isActive = false;
  await product.save();
  res.json({ message: "Listing removed from the storefront" });
});

module.exports = router;
