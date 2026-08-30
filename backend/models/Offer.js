const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    code: { type: String, unique: true, sparse: true, uppercase: true, trim: true }, // optional coupon code
    discountPercent: { type: Number, required: true },
    image: { type: String, default: "" }, // banner image for the offer
    validFrom: { type: Date, default: Date.now },
    validTill: { type: Date },
    isActive: { type: Boolean, default: true },
    appliesTo: {
      type: String,
      enum: ["all", "category"],
      default: "all",
    },
    category: { type: String, default: "" }, // used if appliesTo === "category"
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);
