const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const documentSchema = new mongoose.Schema(
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
    documentTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentType",
      required: true,
    },

    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    version: { type: Number, default: 1 },
    expiryDate: { type: Date, required: true },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["valid", "expiring", "expired"],
      required: true,
      index: true,
    },

    // Re-uploads create a NEW document row pointing back at the one it
    // replaces, rather than overwriting it in place — so compliance
    // history isn't lost. See document.service.js#reuploadDocument.
    previousVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },
  },
  { timestamps: true },
);

documentSchema.plugin(autoIncrementId, { sequenceName: "document" });

module.exports = mongoose.model("Document", documentSchema);
