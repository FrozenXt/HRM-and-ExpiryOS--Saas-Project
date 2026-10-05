const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    default: null,
    index: true,
  },
  action: { type: String, required: true, trim: true, index: true }, // e.g. "update", "delete", "approve"
  entityType: { type: String, required: true, trim: true, index: true }, // must match a registered model name, e.g. "Employee"
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,

    refPath: "entityType",
  },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
  ip: { type: String, trim: true, default: null },
  createdAt: { type: Date, required: true, default: Date.now, index: true },
});

auditLogSchema.plugin(autoIncrementId, { sequenceName: "audit_log" });

module.exports = mongoose.model("AuditLog", auditLogSchema);
