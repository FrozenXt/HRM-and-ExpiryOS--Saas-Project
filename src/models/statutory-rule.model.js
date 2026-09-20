const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const statutoryRuleSchema = new mongoose.Schema(
  {
    country: {
      type: String,
      enum: ["IN", "NP", "US", "other"],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "pf",
        "esi",
        "professional_tax",
        "tds",
        "gratuity",
        "labour_welfare_fund",
      ],
      required: true,
      index: true,
    },
    employeeContributionPercent: { type: Number, default: null },
    employerContributionPercent: { type: Number, default: null },
    wageCeiling: { type: Number, default: null },
    flatAmount: { type: Number, default: null },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

statutoryRuleSchema.plugin(autoIncrementId, { sequenceName: "statutory_rule" });
module.exports = mongoose.model("StatutoryRule", statutoryRuleSchema);
