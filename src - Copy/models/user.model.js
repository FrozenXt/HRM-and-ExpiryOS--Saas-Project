const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    id_int: {
      type: Number,
      unique: true,
      index: true,
    },

    firstName: { type: String, required: true, trim: true, maxlength: 100 },
    lastName: { type: String, required: true, trim: true, maxlength: 100 },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    // Changed: aligned to the HRMS role hierarchy instead of a generic CMS role set
    role: {
      type: String,
      enum: ["super_admin", "admin", "hr", "staff"],
      required: true,
      index: true,
    },

    // New: every Admin/HR/Staff belongs to exactly one company. Super Admin has none.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "blocked", "pending"],
      default: "active",
      index: true,
    },

    // New: bumping this instantly invalidates every access token already issued to this user
    tokenVersion: {
      type: Number,
      default: 0,
    },

    mustResetPassword: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
    createdIp: { type: String, default: null },
    emailVerifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.pre("validate", function () {
  if (this.role !== "super_admin" && !this.companyId) {
    throw new Error(`companyId is required for role "${this.role}"`);
  }
  if (this.role === "super_admin" && this.companyId) {
    throw new Error("super_admin must not have a companyId");
  }
});

module.exports = mongoose.model("User", userSchema);
