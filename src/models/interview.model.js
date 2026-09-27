const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    round: { type: Number, required: true, min: 1 },
    interviewerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    scheduledAt: { type: Date, required: true, index: true },
    mode: {
      type: String,
      enum: ["in_person", "video", "phone"],
      required: true,
    },
    feedback: { type: String, default: null },
    rating: { type: Number, min: 1, max: 5, default: null },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "no_show"],
      default: "scheduled",
      index: true,
    },
  },
  { timestamps: true },
);

interviewSchema.index({ companyId: 1, candidateId: 1, round: 1 });

module.exports = mongoose.model("Interview", interviewSchema);
