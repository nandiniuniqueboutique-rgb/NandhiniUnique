const mongoose = require("mongoose");

// Each size a saree/dress can be ordered in, and how much extra it costs
// over the base price. The seller decides this per product.
const sizeOptionSchema = new mongoose.Schema(
  {
    size: { type: String, required: true }, // e.g. "Free Size", "S", "M", "L", "XL", "Custom Stitched"
    priceModifier: { type: Number, default: 0 }, // added on top of basePrice (can be negative)
    stock: { type: Number, default: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    images: [{ type: String }], // relative paths like /uploads/xyz.jpg

    // What kind of product this is. Lets the storefront show separate "Sarees" and
    // "Dresses" sections, each with their own sizing (Free Size vs S/M/L/XL etc).
    productType: {
      type: String,
      enum: ["Saree", "Dress", "Other"],
      default: "Saree",
    },

    // The seller types this in freely (e.g. "Kanjivaram", "Tussar", "Party Wear Gown",
    // "Anarkali") rather than picking from a fixed list, since new fabric/style names
    // come up all the time and shouldn't be blocked by a hardcoded dropdown.
    category: { type: String, default: "", trim: true },

    color: { type: String, default: "" },
    fabric: { type: String, default: "" },

    // Free-form extra details the seller may want to capture per saree
    // (blouse included?, work type, occasion, wash care, origin, etc.)
    // Kept schemaless on purpose since every saree can have different attributes.
    attributes: { type: mongoose.Schema.Types.Mixed, default: {} },

    basePrice: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 }, // manual discount, independent of Offers
    sizeOptions: {
      type: [sizeOptionSchema],
      default: [{ size: "Free Size", priceModifier: 0, stock: 0 }],
    },

    stock: { type: Number, default: 0 }, // overall stock (used if sizeOptions not tracked individually)
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }, // owner can hide sold-out / retired designs

    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.methods.priceForSize = function (sizeName) {
  const opt = this.sizeOptions.find((s) => s.size === sizeName);
  const modifier = opt ? opt.priceModifier : 0;
  const withDiscount = (this.basePrice + modifier) * (1 - (this.discountPercent || 0) / 100);
  return Math.round(withDiscount);
};

module.exports = mongoose.model("Product", productSchema);
