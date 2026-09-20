// models/leave-balance.model.js
const mongoose = require("mongoose");

const leaveBalanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    leaveTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    year: { type: Number, required: true },
    used: { type: Number, required: true, default: 0 },
    remaining: { type: Number, required: true },
  },
  { timestamps: true },
);

leaveBalanceSchema.index(
  { employeeId: 1, leaveTypeId: 1, year: 1 },
  { unique: true },
);

module.exports = mongoose.model("LeaveBalance", leaveBalanceSchema);
