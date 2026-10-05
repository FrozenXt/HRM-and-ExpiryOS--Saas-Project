const mongoose = require("mongoose");
const autoIncrementId = require("../plugins/auto-increment.plugin");

// One Subscription document per company (enforced by the unique index below).
// Subscribing to a new plan or billing cycle updates this same record rather
// than creating a new one — this keeps the model simple, at the cost of not
// retaining history. If you need an audit trail/invoice list later, that's a
// separate SubscriptionHistory/Invoice model layered on top of this.
const subscriptionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },

    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },

    // Always server-computed — see subscription.service.js. Never trust a
    // value for these coming from the frontend.
    employeeCount: { type: Number, required: true, default: 0 },
    pricePerEmployee: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    currency: { type: String, default: "NPR" },

    startDate: { type: Date, required: true, default: Date.now },
    // null for the Free plan, which never renews/bills.
    nextBillingDate: { type: Date, default: null },

    status: {
      type: String,
      enum: ["active", "past_due", "cancelled"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

subscriptionSchema.index({ companyId: 1 }, { unique: true });

subscriptionSchema.plugin(autoIncrementId, { sequenceName: "subscription" });

module.exports = mongoose.model("Subscription", subscriptionSchema);
