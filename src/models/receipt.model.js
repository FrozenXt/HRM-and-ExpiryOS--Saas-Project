const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const receiptSchema = new mongoose.Schema(
  {
    expenseClaimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseClaim",
      required: true,
      index: true,
    },

    // Not in the original table — denormalized from the parent ExpenseClaim
    // at upload time so this can be tenant/employee-scoped directly.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    uploadedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false },
);

receiptSchema.plugin(autoIncrementId, { sequenceName: "receipt" });
module.exports = mongoose.model("Receipt", receiptSchema);
