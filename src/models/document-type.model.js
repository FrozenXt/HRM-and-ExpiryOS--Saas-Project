const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const documentTypeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    // e.g. [90, 60, 30, 7, 0] — days before expiry to fire a reminder.
    defaultReminderOffsetsDays: { type: [Number], required: true },
  },
  { timestamps: true },
);

documentTypeSchema.index({ companyId: 1, name: 1 }, { unique: true });
documentTypeSchema.plugin(autoIncrementId, { sequenceName: "document_type" });

module.exports = mongoose.model("DocumentType", documentTypeSchema);
