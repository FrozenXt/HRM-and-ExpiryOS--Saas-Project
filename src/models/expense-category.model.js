const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const expenseCategorySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    monthlyLimit: { type: Number, default: null },
  },
  { timestamps: true },
);

expenseCategorySchema.index({ companyId: 1, name: 1 }, { unique: true });
expenseCategorySchema.plugin(autoIncrementId, {
  sequenceName: "expense_category",
});
module.exports = mongoose.model("ExpenseCategory", expenseCategorySchema);
