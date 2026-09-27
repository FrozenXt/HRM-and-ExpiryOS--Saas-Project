const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const assetAssignmentSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    assignedDate: { type: Date, required: true },
    returnedDate: { type: Date, default: null },
    condition: {
      type: String,
      enum: ["good", "damaged", "lost"],
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

assetAssignmentSchema.plugin(autoIncrementId, {
  sequenceName: "asset_assignment",
});

module.exports = mongoose.model("AssetAssignment", assetAssignmentSchema);
