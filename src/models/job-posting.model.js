const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const jobPostingSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      default: null,
    },
    description: { type: String, required: true },
    requirements: { type: [String], default: [] },
    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "intern"],
      required: true,
    },
    numberOfOpenings: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["open", "on_hold", "closed"],
      default: "open",
      index: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    closingDate: { type: Date, default: null },
  },
  { timestamps: true },
);

jobPostingSchema.plugin(autoIncrementId, { sequenceName: "job_posting" });
module.exports = mongoose.model("JobPosting", jobPostingSchema);
