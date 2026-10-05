const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const notificationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    channel: { type: String, enum: ["email", "sms"], required: true },
    templateCode: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true,
      index: true,
    },
    sentAt: { type: Date, required: true, default: Date.now },
    error: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

notificationLogSchema.plugin(autoIncrementId, {
  sequenceName: "notification_log",
});

module.exports = mongoose.model("NotificationLog", notificationLogSchema);
