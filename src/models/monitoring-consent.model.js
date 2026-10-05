const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

// Append-only: every grant or revocation is a NEW record, never an edit,
// so there's a full legal audit trail. The latest record per employee wins.
const monitoringConsentSchema = new mongoose.Schema(
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
    consentGiven: { type: Boolean, required: true },
    consentDate: { type: Date, required: true, default: Date.now },
    policyVersion: { type: String, required: true, trim: true },
    ipAddress: { type: String, default: null },
  },
  { timestamps: false },
);

monitoringConsentSchema.index({ employeeId: 1, consentDate: -1 });
monitoringConsentSchema.plugin(autoIncrementId, {
  sequenceName: "monitoring_consent",
});
module.exports = mongoose.model("MonitoringConsent", monitoringConsentSchema);
