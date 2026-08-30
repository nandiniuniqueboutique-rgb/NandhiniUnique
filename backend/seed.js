require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/User");
const Product = require("./models/Product");
const Offer = require("./models/Offer");

async function seed() {
  await connectDB();

  const adminEmail = "owner@nandiniunique.com";
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const hashed = await bcrypt.hash("Nandini@123", 10);
    await User.create({
      name: "Nandini Unique Admin",
      email: adminEmail,
      phone: process.env.STORE_WHATSAPP_NUMBER || "919999999999",
      password: hashed,
      role: "admin",
    });
    console.log(`Created admin login -> email: ${adminEmail} / password: Nandini@123`);
  } else {
    console.log("Admin account already exists, skipping.");
  }

  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany([
      {
        name: "Kanjivaram Silk Saree - Royal Maroon",
        description:
          "A handwoven Kanjivaram silk saree in a rich maroon with a temple-style gold zari border. Comes with a matching unstitched blouse piece.",
        images: [],
        productType: "Saree",
        category: "Kanjivaram",
        color: "Maroon",
        fabric: "Pure Silk",
        attributes: { work: "Zari Border", blouseIncluded: true, occasion: "Wedding" },
        basePrice: 8999,
        discountPercent: 10,
        sizeOptions: [
          { size: "Free Size (5.5m)", priceModifier: 0, stock: 6 },
          { size: "With Stitched Blouse (custom size)", priceModifier: 600, stock: 4 },
        ],
        stock: 10,
        isFeatured: true,
      },
      {
        name: "Banarasi Georgette Saree - Emerald Green",
        description:
          "Lightweight Banarasi georgette saree with delicate silver zari motifs, perfect for festive daytime events.",
        images: [],
        productType: "Saree",
        category: "Banarasi",
        color: "Emerald Green",
        fabric: "Georgette",
        attributes: { work: "Zari Motifs", blouseIncluded: false, occasion: "Festive" },
        basePrice: 3499,
        discountPercent: 0,
        sizeOptions: [{ size: "Free Size (5.5m)", priceModifier: 0, stock: 12 }],
        stock: 12,
        isFeatured: true,
      },
      {
        name: "Handloom Cotton Saree - Indigo Ikat",
        description: "Breathable handloom cotton saree with traditional ikat weaving, great for daily and office wear.",
        images: [],
        productType: "Saree",
        category: "Cotton",
        color: "Indigo",
        fabric: "Handloom Cotton",
        attributes: { work: "Ikat Weave", blouseIncluded: true, occasion: "Daily wear" },
        basePrice: 1499,
        discountPercent: 5,
        sizeOptions: [
          { size: "Free Size (5.5m)", priceModifier: 0, stock: 20 },
          { size: "With Stitched Blouse", priceModifier: 350, stock: 8 },
        ],
        stock: 20,
        isFeatured: false,
      },
      {
        name: "Anarkali Party Wear Dress - Dusty Rose",
        description:
          "A flowing floor-length Anarkali dress with light embroidery on the yoke, stitched and ready to wear - no tailoring needed.",
        images: [],
        productType: "Dress",
        category: "Party Wear Dress",
        color: "Dusty Rose",
        fabric: "Georgette",
        attributes: { work: "Thread Embroidery", occasion: "Party/Function", stitched: true },
        basePrice: 2799,
        discountPercent: 0,
        sizeOptions: [
          { size: "S", priceModifier: 0, stock: 5 },
          { size: "M", priceModifier: 0, stock: 8 },
          { size: "L", priceModifier: 100, stock: 6 },
          { size: "XL", priceModifier: 200, stock: 4 },
        ],
        stock: 23,
        isFeatured: true,
      },
    ]);
    console.log("Inserted 4 sample products (3 sarees + 1 dress).");
  } else {
    console.log("Products already exist, skipping sample data.");
  }

  const offerCount = await Offer.countDocuments();
  if (offerCount === 0) {
    await Offer.create({
      title: "Festive Season Sale",
      description: "Flat 10% off on all Kanjivaram silk sarees this festive season.",
      code: "FESTIVE10",
      discountPercent: 10,
      appliesTo: "all",
      isActive: true,
    });
    console.log("Inserted a sample offer (code: FESTIVE10).");
  }

  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
