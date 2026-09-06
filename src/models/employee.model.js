const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    relation: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const employeeSchema = new mongoose.Schema(
  {
    // One Employee profile per User — enforced by the unique index below.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      required: true,
      index: true,
    },
    reportingManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    joiningDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    dateOfBirth: { type: Date, default: null },
    personalEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    emergencyContact: { type: emergencyContactSchema, default: () => ({}) },
  },
  { timestamps: true },
);

employeeSchema.plugin(autoIncrementId, { sequenceName: "employee" });

module.exports = mongoose.model("Employee", employeeSchema);
