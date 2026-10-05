const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const deviceSessionSchema = new mongoose.Schema(
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
    deviceId: { type: String, required: true, trim: true, index: true },
    deviceType: {
      type: String,
      enum: ["desktop", "laptop", "mobile"],
      required: true,
    },
    os: { type: String, trim: true, default: null },
    appVersion: { type: String, trim: true, default: null },
    sessionStart: { type: Date, required: true, default: Date.now },
    sessionEnd: { type: Date, default: null },
    ipAddress: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

deviceSessionSchema.index({ employeeId: 1, sessionStart: -1 });
deviceSessionSchema.plugin(autoIncrementId, { sequenceName: "device_session" });

module.exports = mongoose.model("DeviceSession", deviceSessionSchema);
