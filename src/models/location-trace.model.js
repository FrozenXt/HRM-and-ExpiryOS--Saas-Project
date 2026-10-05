const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const locationTraceSchema = new mongoose.Schema(
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
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeviceSession",
      default: null,
      index: true,
    },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    accuracyMeters: { type: Number, min: 0, default: null },
    capturedAt: { type: Date, required: true },
    deviceId: { type: String, trim: true, default: null },
    source: {
      type: String,
      enum: ["mobile_app", "desktop_app", "check_in"],
      required: true,
    },
  },
  { timestamps: true },
);

locationTraceSchema.index({ employeeId: 1, capturedAt: -1 });
locationTraceSchema.plugin(autoIncrementId, { sequenceName: "location_trace" });

module.exports = mongoose.model("LocationTrace", locationTraceSchema);
