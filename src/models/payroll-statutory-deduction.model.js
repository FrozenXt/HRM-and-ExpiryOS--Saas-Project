const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const payrollStatutoryDeductionSchema = new mongoose.Schema(
  {
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payroll",
      required: true,
      unique: true,
      index: true,
    },
    // Not in the original table — denormalized from Payroll.companyId so
    // this can be tenant-scoped directly.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    pfEmployeeContribution: { type: Number, default: 0 },
    pfEmployerContribution: { type: Number, default: 0 },
    esiEmployeeContribution: { type: Number, default: 0 },
    esiEmployerContribution: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    gratuityAccrued: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
  },
  { timestamps: true },
);

payrollStatutoryDeductionSchema.plugin(autoIncrementId, {
  sequenceName: "payroll_statutory_deduction",
});
module.exports = mongoose.model(
  "PayrollStatutoryDeduction",
  payrollStatutoryDeductionSchema,
);
