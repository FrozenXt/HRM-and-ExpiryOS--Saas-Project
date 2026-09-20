const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
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

    // "YYYY-MM" — validated in the service, not the schema, so error
    // messages stay consistent with everything else's error shape.
    period: { type: String, required: true },

    payableDays: { type: Number, required: true },
    regularHours: { type: Number, default: null },
    overtimeHours: { type: Number, default: null },

    grossPay: { type: Number, required: true },
    overtimePay: { type: Number, default: 0 },
    deductions: { type: Number, required: true },
    netPay: { type: Number, required: true },

    status: {
      type: String,
      enum: ["draft", "approved", "released"],
      default: "draft",
      index: true,
    },
    payslipUrl: { type: String, default: null },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

payrollSchema.index({ employeeId: 1, period: 1 }, { unique: true });
payrollSchema.plugin(autoIncrementId, { sequenceName: "payroll" });
module.exports = mongoose.model("Payroll", payrollSchema);
