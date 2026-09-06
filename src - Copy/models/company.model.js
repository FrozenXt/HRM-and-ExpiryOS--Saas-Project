const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    legalName: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, unique: true },

    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Company", companySchema);
