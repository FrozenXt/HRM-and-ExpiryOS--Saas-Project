const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    employeeLimit: { type: Number, required: true },
    features: { type: [String], default: [] },
    monthlyPrice: { type: Number, required: true },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

planSchema.plugin(autoIncrementId, { sequenceName: "plan" });

module.exports = mongoose.model("Plan", planSchema);
