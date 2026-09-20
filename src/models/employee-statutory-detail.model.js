const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");
const { encrypt } = require("../utils/encryption");

const employeeStatutoryDetailSchema = new mongoose.Schema(
  {
    // One record per employee.
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      unique: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    panNumber: { type: String, trim: true, default: null },

    // Encrypted at rest (AES-256-CBC — see utils/encryption.js). Hidden
    // from default queries; only readable via an explicit .select("+aadhaarNumber").
    aadhaarNumber: {
      type: String,
      select: false,
      default: null,
      set: (v) => (v ? encrypt(v) : v),
    },

    uanNumber: { type: String, trim: true, default: null },
    pfNumber: { type: String, trim: true, default: null },
    esiNumber: { type: String, trim: true, default: null },

    // Also encrypted at rest, same pattern as aadhaarNumber.
    bankAccountNumber: {
      type: String,
      required: true,
      select: false,
      set: (v) => (v ? encrypt(v) : v),
    },

    ifscCode: { type: String, trim: true, default: null },
    bankName: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

employeeStatutoryDetailSchema.plugin(autoIncrementId, {
  sequenceName: "employee_statutory_detail",
});
module.exports = mongoose.model(
  "EmployeeStatutoryDetail",
  employeeStatutoryDetailSchema,
);
