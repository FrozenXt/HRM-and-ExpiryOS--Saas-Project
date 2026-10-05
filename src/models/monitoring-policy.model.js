const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const monitoringPolicySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
      index: true,
    },
    country: {
      type: String,
      enum: ["IN", "NP", "US", "other"],
      required: true,
      default: "other",
    },
    screenshotEnabled: { type: Boolean, required: true, default: false },
    screenshotIntervalMinutes: { type: Number, default: null },
    locationTrackingEnabled: { type: Boolean, required: true, default: false },
    geofencingEnabled: { type: Boolean, required: true, default: false },
    activityTrackingEnabled: { type: Boolean, required: true, default: false },

    retentionDays: { type: Number, required: true, default: 90 },
  },
  { timestamps: true },
);

monitoringPolicySchema.plugin(autoIncrementId, {
  sequenceName: "monitoring_policy",
});
module.exports = mongoose.model("MonitoringPolicy", monitoringPolicySchema);
