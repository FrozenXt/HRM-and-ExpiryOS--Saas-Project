const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

// Raw punch events, one row per tap on the kiosk (or mobile/web later).
// Attendance is the daily summary; PunchLog is the audit trail behind it.
// Kept forever — rows are tiny and the history is genuinely useful.
const punchLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    punchedAt: { type: Date, required: true, default: Date.now, index: true },
    type: {
      type: String,
      enum: ["in", "out"],
      required: true,
    },
    // Where the punch came from. Today: kiosk. Future: mobile, web, biometric.
    source: {
      type: String,
      enum: ["kiosk", "mobile", "web", "biometric", "simulator"],
      default: "kiosk",
      required: true,
    },
    // Optional device label — useful when you have more than one kiosk.
    deviceId: { type: String, default: null, trim: true },

    // Optional location, if the kiosk ever sends it (mobile app will).
    location: {
      type: new mongoose.Schema(
        { latitude: Number, longitude: Number },
        { _id: false },
      ),
      default: null,
    },

    // Result of the punch attempt. "accepted" means it changed Attendance;
    // the others explain why it was rejected.
    result: {
      type: String,
      enum: ["accepted", "rejected"],
      required: true,
      index: true,
    },
    // Populated when result === "rejected" — e.g. "Already checked in today".
    rejectionReason: { type: String, default: null },

    pinVerified: { type: Boolean, required: true },

    // The Attendance record this punch was written into (if accepted).
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      default: null,
    },
  },
  { timestamps: true },
);

// Common access patterns:
//   1. "Show me today's punches for a company" (live board, audit)
//   2. "Show me one employee's punch history"
punchLogSchema.index({ companyId: 1, punchedAt: -1 });
punchLogSchema.index({ employeeId: 1, punchedAt: -1 });

punchLogSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

// Reuses the same sequence plugin your other models use.
punchLogSchema.plugin(autoIncrementId, { sequenceName: "punch_log" });

module.exports = mongoose.model("PunchLog", punchLogSchema);
