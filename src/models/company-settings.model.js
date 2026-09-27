const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");
const { encrypt } = require("../utils/encryption");

const workingHoursSchema = new mongoose.Schema(
  {
    startTime: { type: String, default: "09:00" },
    endTime: { type: String, default: "18:00" },
    timezone: { type: String, default: "Asia/Kathmandu" },
  },
  { _id: false },
);

const attendancePolicySchema = new mongoose.Schema(
  {
    fullDayMinHours: { type: Number, default: 8 },
    halfDayMinHours: { type: Number, default: 4 },
    lateMarkGraceMinutes: { type: Number, default: 15 },
    autoMarkAbsentIfNoCheckIn: { type: Boolean, default: true },
  },
  { _id: false },
);

const brandingSchema = new mongoose.Schema(
  {
    primaryColor: { type: String, default: "#4f46e5" },
    secondaryColor: { type: String, default: "#0ea5e9" },
    logoUrl: { type: String, default: null },
    defaultTheme: {
      type: String,
      enum: ["light", "dark", "auto"],
      default: "light",
    },
  },
  { _id: false },
);

const mailSettingsSchema = new mongoose.Schema(
  {
    fromName: { type: String, default: null },
    fromEmail: { type: String, default: null },
    smtpHost: { type: String, default: null },
    smtpPort: { type: Number, default: null },
    smtpUsername: { type: String, default: null },
    smtpPassword: {
      type: String,
      select: false,
      default: null,
      set: (v) => (v ? encrypt(v) : v),
    },
    useTls: { type: Boolean, default: true },
  },
  { _id: false },
);

const countrySettingsSchema = new mongoose.Schema(
  {
    country: {
      type: String,
      enum: ["IN", "NP", "US", "other"],
      default: "other",
    },
    pfApplicable: { type: Boolean, default: false },
    esiApplicable: { type: Boolean, default: false },
    professionalTaxApplicable: { type: Boolean, default: false },
    tdsApplicable: { type: Boolean, default: false },
  },
  { _id: false },
);

const notificationsSchema = new mongoose.Schema(
  {
    documentExpiryReminders: { type: Boolean, default: true },
    leaveRequestAlerts: { type: Boolean, default: true },
    attendanceAlerts: { type: Boolean, default: true },
  },
  { _id: false },
);

const companySettingsSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
      index: true,
    },
    workingHours: { type: workingHoursSchema, default: () => ({}) },
    weekOff: {
      type: [String],
      enum: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
      default: ["sat", "sun"],
    },
    attendancePolicy: { type: attendancePolicySchema, default: () => ({}) },
    financialYearStartMonth: { type: Number, min: 1, max: 12, default: 1 },
    branding: { type: brandingSchema, default: () => ({}) },
    mailSettings: { type: mailSettingsSchema, default: () => ({}) },
    countrySettings: { type: countrySettingsSchema, default: () => ({}) },
    notifications: { type: notificationsSchema, default: () => ({}) },
  },
  { timestamps: true },
);

companySettingsSchema.plugin(autoIncrementId, {
  sequenceName: "company_settings",
});
module.exports = mongoose.model("CompanySettings", companySettingsSchema);
