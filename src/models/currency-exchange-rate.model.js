const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const currencyExchangeRateSchema = new mongoose.Schema(
  {
    baseCurrencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },
    targetCurrencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },
    rate: { type: Number, required: true },
    effectiveDate: { type: Date, required: true },
    source: {
      type: String,
      enum: ["manual", "api"],
      required: true,
      default: "manual",
    },
  },
  { timestamps: true },
);

currencyExchangeRateSchema.index(
  { baseCurrencyId: 1, targetCurrencyId: 1, effectiveDate: 1 },
  { unique: true },
);
currencyExchangeRateSchema.plugin(autoIncrementId, {
  sequenceName: "currency_exchange_rate",
});
module.exports = mongoose.model(
  "CurrencyExchangeRate",
  currencyExchangeRateSchema,
);
