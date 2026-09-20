const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const payComponentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const salaryStructureSchema = new mongoose.Schema(
  {
    // One structure per employee — amend it in place rather than versioning.
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      unique: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    currencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },
    wageType: {
      type: String,
      enum: ["hourly", "daily", "weekly", "monthly", "annual"],
      required: true,
    },
    payFrequency: {
      type: String,
      enum: ["weekly", "biweekly", "semi_monthly", "monthly"],
      required: true,
    },
    basic: { type: Number, required: true },
    hourlyRate: { type: Number, default: null },
    dailyRate: { type: Number, default: null },
    overtimeRateMultiplier: { type: Number, default: null },
    allowances: { type: [payComponentSchema], default: [] },
    deductions: { type: [payComponentSchema], default: [] },
  },
  { timestamps: true },
);

salaryStructureSchema.plugin(autoIncrementId, {
  sequenceName: "salary_structure",
});
module.exports = mongoose.model("SalaryStructure", salaryStructureSchema);
