const mongoose = require("mongoose");

const geoPointSchema = new mongoose.Schema(
  { latitude: Number, longitude: Number },
  { _id: false },
);

const attendanceSchema = new mongoose.Schema(
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
    date: { type: Date, required: true, index: true },
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    status: {
      type: String,
      enum: ["present", "absent", "late", "half_day"],
      required: true,
      default: "present",
    },
    checkInLocation: { type: geoPointSchema, default: null },
    checkOutLocation: { type: geoPointSchema, default: null },
    geofenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GeofenceZone",
      default: null,
    },
    isWithinGeofence: { type: Boolean, default: null },
  },
  { timestamps: true },
);

// One attendance record per employee per day.
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
