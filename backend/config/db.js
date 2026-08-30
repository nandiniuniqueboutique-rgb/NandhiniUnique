const mongoose = require("mongoose");

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nandini_unique";
    await mongoose.connect(uri);
    console.log(`MongoDB connected -> ${mongoose.connection.name}`);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.error("Make sure MongoDB is running, or set MONGO_URI in backend/.env to an Atlas connection string.");
    process.exit(1);
  }
}

module.exports = connectDB;
