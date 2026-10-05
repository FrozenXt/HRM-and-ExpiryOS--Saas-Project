const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const resignationSchema = new mongoose.Schema(
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
    reason: { type: String, required: true, trim: true },
    resignationDate: { type: Date, default: Date.now },

    // What the employee asked for vs. what Admin/HR finally agreed.
    proposedLastWorkingDay: { type: Date, required: true },
    lastWorkingDay: { type: Date, default: null },

    // completed = last working day passed and the employee was made inactive.
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "withdrawn", "completed"],
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    remarks: { type: String, trim: true, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

resignationSchema.plugin(autoIncrementId, { sequenceName: "resignation" });

module.exports = mongoose.model("Resignation", resignationSchema);
