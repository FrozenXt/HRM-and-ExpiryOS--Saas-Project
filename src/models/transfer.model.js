const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const ref = (model) => ({
  type: mongoose.Schema.Types.ObjectId,
  ref: model,
  default: null,
});

const transferSchema = new mongoose.Schema(
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

    // Snapshot of where the employee was when the transfer was raised.
    fromDepartmentId: ref("Department"),
    fromDesignationId: ref("Designation"),
    fromReportingManagerId: ref("Employee"),
    fromShiftId: ref("Shift"),

    // null = unchanged. At least one must be set (checked in the service).
    toDepartmentId: ref("Department"),
    toDesignationId: ref("Designation"),
    toReportingManagerId: ref("Employee"),
    toShiftId: ref("Shift"),

    effectiveDate: { type: Date, required: true },
    reason: { type: String, trim: true, default: null },

    // applied = the employee record has been updated.
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "applied", "cancelled"],
      default: "pending",
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewedBy: ref("User"),
    reviewedAt: { type: Date, default: null },
    remarks: { type: String, trim: true, default: null },
    appliedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

transferSchema.plugin(autoIncrementId, { sequenceName: "transfer" });

module.exports = mongoose.model("Transfer", transferSchema);
