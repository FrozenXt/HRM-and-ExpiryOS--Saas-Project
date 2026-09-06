const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const designationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

designationSchema.index({ companyId: 1, name: 1 }, { unique: true });
designationSchema.plugin(autoIncrementId, { sequenceName: "designation" });

module.exports = mongoose.model("Designation", designationSchema);
