const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const assetSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    assetTag: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["laptop", "mobile", "accessory", "furniture", "other"],
      required: true,
      index: true,
    },
    serialNumber: { type: String, trim: true, default: null },
    purchaseDate: { type: Date, default: null },
    purchaseCost: { type: Number, default: null },
    status: {
      type: String,
      enum: ["available", "assigned", "under_repair", "retired"],
      required: true,
      default: "available",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// One assetTag per company, not globally — two different companies can each
// have their own "LAP-001".
assetSchema.index({ companyId: 1, assetTag: 1 }, { unique: true });

// Virtual: the asset's currently-active assignment, if any (returnedDate
// still null). This is what lets the asset list show "who has this right
// now" in the same response, without a second API call.
assetSchema.virtual("currentAssignment", {
  ref: "AssetAssignment",
  localField: "_id",
  foreignField: "assetId",
  justOne: true,
  match: { returnedDate: null },
});

assetSchema.plugin(autoIncrementId, { sequenceName: "asset" });

module.exports = mongoose.model("Asset", assetSchema);
