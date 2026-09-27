const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const performanceReviewSchema = new mongoose.Schema(
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
    reviewPeriod: { type: String, required: true, trim: true, index: true }, // e.g. "2026-H1"
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: { type: Number, min: 1, max: 5, default: null },
    strengths: { type: String, trim: true, default: null },
    areasOfImprovement: { type: String, trim: true, default: null },
    status: {
      type: String,
      enum: ["draft", "submitted", "acknowledged"],
      required: true,
      default: "draft",
      index: true,
    },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Not in the spec you gave me — added by analogy with Attendance's
// one-per-employee-per-day and SalaryStructure's one-per-employee rules.
// Remove this if you actually want multiple review docs per period
// (e.g. draft + a resubmission) rather than updating one in place.
performanceReviewSchema.index(
  { employeeId: 1, reviewPeriod: 1 },
  { unique: true },
);

performanceReviewSchema.plugin(autoIncrementId, {
  sequenceName: "performance_review",
});

module.exports = mongoose.model("PerformanceReview", performanceReviewSchema);
