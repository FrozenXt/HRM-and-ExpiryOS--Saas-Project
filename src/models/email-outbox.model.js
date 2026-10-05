const mongoose = require("mongoose");

const emailOutboxSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    to: { type: String, required: true },
    templateCode: { type: String, required: true },
    subject: { type: String, required: true },
    html: { type: String, required: true },
    text: { type: String, default: "" },
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] }, // [{filename, path}]
    status: {
      type: String,
      enum: ["pending", "sending", "sent", "failed"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    lockedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

emailOutboxSchema.index({ status: 1, nextAttemptAt: 1 });
// Sent and failed rows are removed after 30 days.
emailOutboxSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 60 * 60 * 24 * 30,
    partialFilterExpression: { status: { $in: ["sent", "failed"] } },
  },
);

module.exports = mongoose.model("EmailOutbox", emailOutboxSchema);
