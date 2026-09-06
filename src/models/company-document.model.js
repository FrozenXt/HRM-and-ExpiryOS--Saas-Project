const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const companyDocumentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "registration_certificate",
        "tax_certificate",
        "address_proof",
        "authorized_signatory_id",
        "other",
      ],
      required: true,
    },

    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending_review", "approved", "rejected"],
      default: "pending_review",
      index: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },

    // Bumped on every re-upload so old file history isn't lost.
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

companyDocumentSchema.plugin(autoIncrementId, {
  sequenceName: "company_document",
});

module.exports = mongoose.model("CompanyDocument", companyDocumentSchema);
