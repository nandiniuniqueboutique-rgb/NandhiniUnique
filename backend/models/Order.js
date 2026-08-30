const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: String, // snapshot in case product is edited/deleted later
    image: String,
    size: String,
    quantity: { type: Number, default: 1 },
    price: { type: Number, required: true }, // price per unit at time of order
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String },
    note: { type: String, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ORDER_STATUSES = [
  "Placed",
  "Confirmed",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Returned",
];

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],

    shippingAddress: {
      name: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
    },

    itemsTotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    couponCode: { type: String, default: "" },

    payment: {
      method: { type: String, enum: ["UPI", "Bank Transfer", "Card/Online", "Cash on Delivery"], default: "UPI" },
      transactionId: { type: String, default: "" }, // UTR number / reference number entered by customer
      status: { type: String, enum: ["Pending", "Verified", "Failed", "Refunded"], default: "Pending" },
      paidAt: { type: Date },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    orderStatus: { type: String, enum: ORDER_STATUSES, default: "Placed" },
    statusHistory: {
      type: [statusHistorySchema],
      default: [{ status: "Placed" }],
    },

    trackingNote: { type: String, default: "" }, // free text like "At Mumbai hub" for the "where is it" question
    whatsappUpdatesSent: [{ status: String, at: Date }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
