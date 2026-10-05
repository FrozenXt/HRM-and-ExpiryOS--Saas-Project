const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const screenshotSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    // DeviceSession isn't built yet — plain ObjectId, not existence-checked.
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeviceSession",
      required: true,
      index: true,
    },
    capturedAt: { type: Date, required: true, default: Date.now },
    fileUrl: { type: String, required: true },
    isBlurred: { type: Boolean, required: true, default: false },
    isFlagged: { type: Boolean, required: true, default: false },
    activeAppName: { type: String, trim: true, default: null },
  },
  { timestamps: false },
);

screenshotSchema.index({ employeeId: 1, capturedAt: -1 });
screenshotSchema.index({ companyId: 1, capturedAt: -1 });
screenshotSchema.plugin(autoIncrementId, { sequenceName: "screenshot" });
module.exports = mongoose.model("Screenshot", screenshotSchema);
