const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

const holidaySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    date: { type: Date, required: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

holidaySchema.index({ companyId: 1, date: 1 });
holidaySchema.plugin(autoIncrementId, { sequenceName: "holiday" });

module.exports = mongoose.model("Holiday", holidaySchema);
