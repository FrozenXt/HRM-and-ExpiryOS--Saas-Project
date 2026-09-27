const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const goalSchema = new mongoose.Schema(
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
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: null },
    targetDate: { type: Date, default: null },
    progress: { type: Number, min: 0, max: 100, required: true, default: 0 },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "missed"],
      required: true,
      default: "not_started",
      index: true,
    },
  },
  { timestamps: true },
);

goalSchema.plugin(autoIncrementId, { sequenceName: "goal" });

module.exports = mongoose.model("Goal", goalSchema);
