const express = require("express");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// GET /api/admin/stats - quick numbers for the dashboard home
router.get("/stats", protect, adminOnly, async (req, res) => {
  const [totalOrders, pendingOrders, totalProducts, openComplaints, totalCustomers, revenueAgg] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ orderStatus: { $in: ["Placed", "Confirmed", "Packed", "Shipped", "Out for Delivery"] } }),
    Product.countDocuments({ isActive: true }),
    Complaint.countDocuments({ status: { $ne: "Resolved" } }),
    User.countDocuments({ role: "customer" }),
    Order.aggregate([
      { $match: { "payment.status": "Verified" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
  ]);

  res.json({
    totalOrders,
    pendingOrders,
    totalProducts,
    openComplaints,
    totalCustomers,
    totalRevenue: revenueAgg[0]?.total || 0,
  });
});

module.exports = router;
