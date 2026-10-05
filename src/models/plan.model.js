const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    monthlyPricePerEmployee: { type: Number, required: true, default: 0 },
    yearlyPricePerEmployee: { type: Number, required: true, default: 0 },

    maxEmployees: { type: Number, default: null },

    isCustomPricing: { type: Boolean, default: false },

    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

planSchema.plugin(autoIncrementId, { sequenceName: "plan" });

module.exports = mongoose.model("Plan", planSchema);
