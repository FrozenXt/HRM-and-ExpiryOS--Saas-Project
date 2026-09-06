const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const leaveTypeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    annualQuota: { type: Number, required: true },
    carryForward: { type: Boolean, default: false },
  },
  { timestamps: true },
);

leaveTypeSchema.index({ companyId: 1, name: 1 }, { unique: true });
leaveTypeSchema.plugin(autoIncrementId, { sequenceName: "leave_type" });

module.exports = mongoose.model("LeaveType", leaveTypeSchema);
