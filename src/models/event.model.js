const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
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
        "birthday",
        "work_anniversary",
        "company_event",
        "meeting",
        "seminar",
        "other",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    description: { type: String, default: null },
    isRecurringYearly: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

eventSchema.index({ companyId: 1, date: 1 });
eventSchema.index({ companyId: 1, type: 1, date: 1 });

module.exports = mongoose.model("Event", eventSchema);
