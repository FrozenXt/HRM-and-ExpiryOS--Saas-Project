const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const timeLogSchema = new mongoose.Schema(
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
    date: { type: Date, required: true },
    hoursWorked: { type: Number, required: true },
    overtimeHours: { type: Number, default: null },
    taskDescription: { type: String, trim: true, default: null },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected"],
      default: "draft",
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

timeLogSchema.plugin(autoIncrementId, { sequenceName: "time_log" });
module.exports = mongoose.model("TimeLog", timeLogSchema);
