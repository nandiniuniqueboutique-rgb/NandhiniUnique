const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    type: { type: String, enum: ["Query", "Complaint", "Return/Exchange", "Other"], default: "Query" },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["Open", "In Progress", "Resolved"], default: "Open" },
    reply: { type: String, default: "" },
    contactPreference: { type: String, enum: ["Email", "WhatsApp"], default: "Email" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
