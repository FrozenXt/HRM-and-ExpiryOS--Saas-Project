const mongoose = require("mongoose");

const backupLogSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["full", "company"],
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    trigger: { type: String, enum: ["scheduled", "manual"], required: true },
    status: {
      type: String,
      enum: ["running", "success", "failed", "expired"],
      default: "running",
      index: true,
    },
    fileName: { type: String, default: null },
    sizeBytes: { type: Number, default: 0 },
    documents: { type: Number, default: 0 },
    collections: { type: Number, default: 0 },
    checksum: { type: String, default: null }, // sha256 of the file
    verified: { type: Boolean, default: false },
    durationMs: { type: Number, default: 0 },
    error: { type: String, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

backupLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("BackupLog", backupLogSchema);
