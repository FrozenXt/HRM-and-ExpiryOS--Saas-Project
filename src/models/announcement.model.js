const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    audience: {
      type: String,
      enum: ["all", "department", "role"],
      required: true,
      default: "all",
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    attachmentUrl: { type: String, default: null },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    publishedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true },
);

announcementSchema.index({ companyId: 1, publishedAt: -1 });

module.exports = mongoose.model("Announcement", announcementSchema);
