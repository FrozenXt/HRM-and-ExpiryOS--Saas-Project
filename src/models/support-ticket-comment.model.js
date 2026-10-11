const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  mimeType: { type: String, default: null },
  sizeBytes: { type: Number, default: 0 },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  uploadedAt: { type: Date, default: Date.now },
});

const supportTicketCommentSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportTicket",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorRole: {
      type: String,
      enum: ["super_admin", "admin", "hr", "staff"],
      required: true,
    },
    message: { type: String, trim: true, default: "", maxlength: 5000 },
    // Internal notes are visible to responders only.
    isInternal: { type: Boolean, default: false },
    attachments: { type: [attachmentSchema], default: [] },
  },
  { timestamps: true },
);

supportTicketCommentSchema.index({ ticketId: 1, createdAt: 1 });

module.exports = mongoose.model(
  "SupportTicketComment",
  supportTicketCommentSchema,
);
