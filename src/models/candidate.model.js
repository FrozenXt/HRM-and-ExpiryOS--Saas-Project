const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const candidateSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    jobPostingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPosting",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    resumeUrl: { type: String, required: true },
    coverLetter: { type: String, default: null },
    source: {
      type: String,
      enum: ["referral", "job_portal", "linkedin", "walk_in", "other"],
      default: null,
    },
    status: {
      type: String,
      enum: [
        "applied",
        "shortlisted",
        "interview_scheduled",
        "interviewed",
        "offered",
        "hired",
        "rejected",
        "withdrawn",
      ],
      default: "applied",
      index: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    appliedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

candidateSchema.plugin(autoIncrementId, { sequenceName: "candidate" });
module.exports = mongoose.model("Candidate", candidateSchema);
