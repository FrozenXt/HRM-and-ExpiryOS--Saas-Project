const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
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
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      required: true,
    },
    offeredSalary: { type: Number, required: true, min: 0 },
    joiningDate: { type: Date, required: true },
    offerLetterUrl: { type: String, default: null },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "declined", "withdrawn"],
      default: "draft",
      index: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    issuedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Offer", offerSchema);
