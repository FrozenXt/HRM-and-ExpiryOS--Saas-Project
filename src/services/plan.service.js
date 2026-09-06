const planRepository = require("../repositories/plan.repository");
const companyRepository = require("../repositories/company.repository");

class PlanService {
  async getPlans(searchHelper) {
    return await planRepository.findAll(searchHelper);
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

    return await planRepository.create(data);
  }

  async updatePlan(id, data) {
    if (data.name) {
      const existingPlan = await planRepository.findByName(data.name);

      if (existingPlan && existingPlan._id.toString() !== id) {
        throw new Error("A plan with this name already exists");
      }
    }

    const plan = await planRepository.update(id, data);

    if (!plan) {
      throw new Error("Plan not found");
    }

    return plan;
  }

  async deletePlan(id) {
    // Mongo has no foreign-key constraints, so we have to check this
    // ourselves — otherwise a Company can be left pointing at a Plan
    // that no longer exists.
    const isPlanInUse = await companyRepository.existsByPlanId(id);

    if (isPlanInUse) {
      throw new Error(
        "This plan is assigned to one or more companies and cannot be deleted",
      );
    }

    const plan = await planRepository.delete(id);

    if (!plan) {
      throw new Error("Plan not found");
    }

    return plan;
  }
}

module.exports = new PlanService();
