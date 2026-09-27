const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const onboardingTaskSchema = new mongoose.Schema(
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
    taskName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["documentation", "it_setup", "training", "compliance", "other"],
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    dueDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      required: true,
      default: "pending",
      index: true,
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

onboardingTaskSchema.plugin(autoIncrementId, {
  sequenceName: "onboarding_task",
});

module.exports = mongoose.model("OnboardingTask", onboardingTaskSchema);
