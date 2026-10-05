const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

// One row per payroll period that has had an installment recovered.
const repaymentSchema = new mongoose.Schema(
  {
    period: { type: String, required: true }, // YYYY-MM
    amount: { type: Number, required: true },
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payroll",
      default: null,
    },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const advanceSalarySchema = new mongoose.Schema(
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
    amount: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },

    installments: { type: Number, required: true },
    installmentAmount: { type: Number, required: true },

    // First payroll month (YYYY-MM) an installment is deducted. Set on approval.
    startPeriod: { type: String, default: null },

    // approved = active and being recovered through payroll.
    // closed   = fully recovered.
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "closed"],
      default: "pending",
      index: true,
    },
    recoveredAmount: { type: Number, default: 0 },
    repayments: { type: [repaymentSchema], default: [] },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: { type: Date, default: null },
    remarks: { type: String, trim: true, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

advanceSalarySchema.plugin(autoIncrementId, { sequenceName: "advance_salary" });

module.exports = mongoose.model("AdvanceSalary", advanceSalarySchema);
