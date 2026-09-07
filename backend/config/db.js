const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nandini_unique";

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log(`MongoDB connected -> ${mongoose.connection.name}`);
    return true;
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.error("Retrying MongoDB connection in 30 seconds.");
    setTimeout(connectDB, 30000);
    return false;
  }
}

module.exports = connectDB;
