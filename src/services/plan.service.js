const planRepository = require("../repositories/plan.repository");
const subscriptionRepository = require("../repositories/subscription.repository");

function slugify(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

class PlanService {
  async getPlans(searchHelper) {
    return await planRepository.findAll(searchHelper);
  }

  async getActivePlans() {
    return await planRepository.findAllActive();
  }

  async getPlanById(id) {
    const plan = await planRepository.findById(id);

    if (!plan) {
      throw new Error("Plan not found");
    }

    return plan;
  }

  async createPlan(data) {
    const existingPlan = await planRepository.findByName(data.name);

    if (existingPlan) {
      throw new Error("A plan with this name already exists");
    }

    const slug = slugify(data.slug || data.name);
    const existingSlug = await planRepository.findBySlug(slug);

    if (existingSlug) {
      throw new Error("A plan with this slug already exists");
    }

    return await planRepository.create({ ...data, slug });
  }

  async updatePlan(id, data) {
    if (data.name) {
      const existingPlan = await planRepository.findByName(data.name);

      if (existingPlan && existingPlan._id.toString() !== id) {
        throw new Error("A plan with this name already exists");
      }
    }

    const payload = { ...data };

    if (data.slug) {
      payload.slug = slugify(data.slug);
    } else if (data.name) {
      payload.slug = slugify(data.name);
    }

    const plan = await planRepository.update(id, payload);

    if (!plan) {
      throw new Error("Plan not found");
    }

    return plan;
  }

  async deletePlan(id) {
    // Mongo has no foreign-key constraints, so we have to check this
    // ourselves — otherwise a company Subscription can be left pointing at a
    // Plan that no longer exists.
    const isPlanInUse = await subscriptionRepository.existsByPlanId(id);

    if (isPlanInUse) {
      throw new Error(
        "This plan has active company subscriptions and cannot be deleted",
      );
    }

    const plan = await planRepository.delete(id);

    if (!plan) {
      throw new Error("Plan not found");
    }

    return plan;
  }

  // Ensures the Free plan exists. Call this once at app boot (see
  // INTEGRATION.md) and it's also called defensively whenever a company
  // needs a Free subscription and the plan happens to be missing.
  async getOrCreateFreePlan() {
    let freePlan = await planRepository.findBySlug("free");

    if (!freePlan) {
      freePlan = await planRepository.create({
        name: "Free",
        slug: "free",
        monthlyPricePerEmployee: 0,
        yearlyPricePerEmployee: 0,
        maxEmployees: 10,
        isCustomPricing: false,
        features: ["payroll", "attendance", "expense_claims"],
        isActive: true,
      });
    }

    return freePlan;
  }
}

module.exports = new PlanService();
