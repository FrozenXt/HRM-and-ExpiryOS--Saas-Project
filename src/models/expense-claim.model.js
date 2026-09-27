const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const expenseClaimSchema = new mongoose.Schema(
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
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    currencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },
    expenseDate: { type: Date, required: true },
    description: { type: String, default: null },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected", "reimbursed"],
      default: "draft",
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: { type: Date, default: null },
    reimbursementMethod: {
      type: String,
      enum: ["payroll", "bank_transfer", "cash"],
      default: null,
    },
    reimbursedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

expenseClaimSchema.plugin(autoIncrementId, { sequenceName: "expense_claim" });
module.exports = mongoose.model("ExpenseClaim", expenseClaimSchema);
