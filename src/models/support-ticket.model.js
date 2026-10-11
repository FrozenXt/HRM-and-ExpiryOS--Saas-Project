const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const STATUSES = [
  "open",
  "in_progress",
  "waiting_on_requester",
  "resolved",
  "closed",
];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const CATEGORIES = [
  "technical",
  "billing",
  "account",
  "attendance",
  "payroll",
  "leave",
  "hr_query",
  "it_support",
  "feature_request",
  "other",
];
const TARGETS = ["platform", "company"];

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

const historySchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // created | status_changed | reopened | assigned | priority_changed | category_changed
    from: { type: String, default: null },
    to: { type: String, default: null },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const supportTicketSchema = new mongoose.Schema(
  {
    // Company the ticket was raised from (tenant isolation).
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    // platform = company admin/hr -> super admin
    // company  = staff -> admin & hr of the same company
    target: { type: String, enum: TARGETS, required: true, index: true },

    subject: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category: { type: String, enum: CATEGORIES, default: "other", index: true },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: "medium",
      index: true,
    },
    status: { type: String, enum: STATUSES, default: "open", index: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    createdByRole: {
      type: String,
      enum: ["admin", "hr", "staff"],
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    attachments: { type: [attachmentSchema], default: [] },

    // Denormalised so the list needs no extra queries.
    commentCount: { type: Number, default: 0 }, // public replies only
    lastActivityAt: { type: Date, default: Date.now, index: true },
    lastReplyAt: { type: Date, default: null },
    lastReplyBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    firstResponseAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    closedAt: { type: Date, default: null },
    resolutionNote: {
      type: String,
      trim: true,
      default: null,
      maxlength: 2000,
    },
    reopenCount: { type: Number, default: 0 },

    history: { type: [historySchema], default: [] },
  },
  { timestamps: true },
);

supportTicketSchema.index({ companyId: 1, status: 1, lastActivityAt: -1 });
supportTicketSchema.index({ target: 1, status: 1, lastActivityAt: -1 });

supportTicketSchema.plugin(autoIncrementId, { sequenceName: "support_ticket" });

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

module.exports = SupportTicket;
module.exports.STATUSES = STATUSES;
module.exports.PRIORITIES = PRIORITIES;
module.exports.CATEGORIES = CATEGORIES;
module.exports.TARGETS = TARGETS;
