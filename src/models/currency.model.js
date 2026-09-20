const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const currencySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      enum: ["INR", "NPR", "USD", "other"],
      required: true,
      unique: true,
    },
    symbol: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    decimalPlaces: { type: Number, default: 2 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

currencySchema.plugin(autoIncrementId, { sequenceName: "currency" });
module.exports = mongoose.model("Currency", currencySchema);
