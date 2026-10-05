const mongoose = require("mongoose");

// Deliberately NO autoIncrementId plugin here: this is high-volume telemetry
// written in batches via insertMany (which skips pre-save hooks anyway), and
// a counter increment per row would just be write contention for an id
// nobody reads. _id is the identifier.
const activityLogSchema = new mongoose.Schema(
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
    timestamp: { type: Date, required: true, default: Date.now },
    activityLevel: { type: String, enum: ["active", "idle"], required: true },
    keystrokeCount: { type: Number, min: 0, default: null },
    mouseEventCount: { type: Number, min: 0, default: null },
    activeAppName: { type: String, trim: true, default: null },
    activeWindowTitle: { type: String, trim: true, default: null },
  },
  { timestamps: false },
);

activityLogSchema.index({ employeeId: 1, timestamp: -1 });
activityLogSchema.index({ companyId: 1, timestamp: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
