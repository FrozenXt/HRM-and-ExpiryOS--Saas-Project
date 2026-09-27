const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const geofenceZoneSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radiusMeters: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, required: true, default: true, index: true },
  },
  { timestamps: true },
);

geofenceZoneSchema.plugin(autoIncrementId, { sequenceName: "geofence_zone" });

module.exports = mongoose.model("GeofenceZone", geofenceZoneSchema);
