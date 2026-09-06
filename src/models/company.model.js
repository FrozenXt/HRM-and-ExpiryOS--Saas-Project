const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const contactPersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    designation: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true, default: null },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
  },
  { _id: false },
);

// India-specific statutory identifiers. All optional — only relevant when
// company.country === "IN". Kept flat/optional so NP/US/other companies
// simply omit them.
const statutoryConfigSchema = new mongoose.Schema(
  {
    panOfCompany: { type: String, trim: true, default: null },
    tanNumber: { type: String, trim: true, default: null },
    gstin: { type: String, trim: true, default: null },
    pfEstablishmentId: { type: String, trim: true, default: null },
    esiEstablishmentId: { type: String, trim: true, default: null },
    ptState: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const companySchema = new mongoose.Schema(
  {
    legalName: { type: String, required: true, trim: true },
    tradeName: { type: String, trim: true, default: null },

    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    taxId: { type: String, required: true, trim: true },

    industry: { type: String, trim: true, default: null },
    foundedDate: { type: Date, default: null },

    contactPerson: { type: contactPersonSchema, required: true },
    address: { type: addressSchema, required: true },

    country: {
      type: String,
      enum: ["IN", "NP", "US", "other"],
      required: true,
      index: true,
    },

    currencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },

    billingEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // Optional per-company override of the plan's employeeLimit.
    employeeLimit: { type: Number, default: null },

    subscriptionStatus: {
      type: String,
      enum: ["trial", "active", "past_due", "suspended", "cancelled"],
      required: true,
      default: "trial",
      index: true,
    },
    subscriptionStartDate: { type: Date, required: true, default: Date.now },
    subscriptionEndDate: { type: Date, default: null },

    // Set programmatically during registration — see company.repository.js.
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    logoUrl: { type: String, default: null },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: { type: Date, default: null },

    statutoryConfig: { type: statutoryConfigSchema, default: () => ({}) },
  },
  { timestamps: true },
);

companySchema.plugin(autoIncrementId, { sequenceName: "company" });

module.exports = mongoose.model("Company", companySchema);
