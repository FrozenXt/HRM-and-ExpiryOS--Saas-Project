const Subscription = require("../models/subscription.model");

const PLAN_FIELDS =
  "name slug monthlyPricePerEmployee yearlyPricePerEmployee maxEmployees isCustomPricing features";
const COMPANY_FIELDS = "legalName tradeName";

class SubscriptionRepository {
  async findAll(searchHelper) {
    const filters = searchHelper.getFilters();

    const [data, total] = await Promise.all([
      Subscription.find(filters)
        .populate("planId", PLAN_FIELDS)
        .populate("companyId", COMPANY_FIELDS)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),

      Subscription.countDocuments(filters),
    ]);

    return {
      data,
      total,
    };
  }

  async findByCompanyId(companyId) {
    return await Subscription.findOne({ companyId }).populate(
      "planId",
      PLAN_FIELDS,
    );
  }

  async findById(id) {
    return await Subscription.findById(id)
      .populate("planId", PLAN_FIELDS)
      .populate("companyId", COMPANY_FIELDS);
  }

  // One subscription per company — subscribing to a new plan/cycle updates
  // the existing record (or creates it, on a company's very first subscribe).
  // One subscription per company. A new one is created with create() so the
  // id_int plugin runs (upserts skip save hooks and leave id_int null).
  async upsertForCompany(companyId, data) {
    const existing = await Subscription.findOne({ companyId });

    if (existing) {
      return await Subscription.findByIdAndUpdate(
        existing._id,
        { $set: data },
        { new: true, runValidators: true },
      );
    }

    try {
      return await Subscription.create({ ...data, companyId });
    } catch (err) {
      // Two requests created it at the same moment: use the winner.
      if (err.code === 11000 && /companyId/.test(err.message)) {
        return await Subscription.findOneAndUpdate(
          { companyId },
          { $set: data },
          { new: true, runValidators: true },
        );
      }
      throw err;
    }
  }

  async update(id, data) {
    return await Subscription.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async existsByPlanId(planId) {
    const count = await Subscription.countDocuments({ planId });
    return count > 0;
  }
}

module.exports = new SubscriptionRepository();
