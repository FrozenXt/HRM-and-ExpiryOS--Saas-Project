// src/models/shift.model.js
const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const shiftSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    startTime: { type: String, required: true, match: HHMM }, // "HH:mm"
    endTime: { type: String, required: true, match: HHMM }, // "HH:mm" (earlier than start = overnight)
    breakMinutes: { type: Number, default: 0, min: 0, max: 600 },
    // null = use the company's lateMarkGraceMinutes
    graceMinutes: { type: Number, default: null, min: 0, max: 240 },
    color: { type: String, default: "#3b82f6", match: /^#[0-9a-fA-F]{6}$/ },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// A company can't have two shifts with the same name.
shiftSchema.index({ companyId: 1, name: 1 }, { unique: true });

shiftSchema.plugin(autoIncrementId, { sequenceName: "shifts" });

module.exports = mongoose.model("Shift", shiftSchema);
