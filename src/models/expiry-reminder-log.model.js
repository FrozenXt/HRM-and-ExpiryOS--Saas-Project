const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const expiryReminderLogSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },

    // Not part of the original design doc's table for this collection, but
    // denormalized here from Document.companyId at write time so this log
    // can be tenant-scoped/queried directly, without an aggregation join
    // back through Document on every read.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    sentAt: { type: Date, required: true },
    channel: { type: String, enum: ["email", "sms"], required: true },
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: { type: String, enum: ["sent", "failed"], required: true },
  },
  { timestamps: false },
);

expiryReminderLogSchema.plugin(autoIncrementId, {
  sequenceName: "expiry_reminder_log",
});

module.exports = mongoose.model("ExpiryReminderLog", expiryReminderLogSchema);
