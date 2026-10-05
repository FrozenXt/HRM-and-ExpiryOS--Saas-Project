const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const notificationTemplateSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    channel: { type: String, enum: ["email", "sms"], required: true },
    subject: { type: String, trim: true, default: null }, // SMS templates typically leave this null
    body: { type: String, required: true },
    variables: { type: [String], default: [] }, // e.g. ["firstName", "companyName"]
  },
  { timestamps: true },
);

notificationTemplateSchema.plugin(autoIncrementId, {
  sequenceName: "notification_template",
});

module.exports = mongoose.model(
  "NotificationTemplate",
  notificationTemplateSchema,
);
