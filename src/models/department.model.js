const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const departmentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

departmentSchema.index({ companyId: 1, name: 1 }, { unique: true });
departmentSchema.plugin(autoIncrementId, { sequenceName: "department" });

module.exports = mongoose.model("Department", departmentSchema);
