const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const savedReportViewSchema = new mongoose.Schema(
  {
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
    name: { type: String, required: true, trim: true },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

savedReportViewSchema.plugin(autoIncrementId, {
  sequenceName: "saved_report_view",
});

module.exports = mongoose.model("SavedReportView", savedReportViewSchema);
