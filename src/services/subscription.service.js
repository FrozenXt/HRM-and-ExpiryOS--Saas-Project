const subscriptionRepository = require("../repositories/subscription.repository");
const planRepository = require("../repositories/plan.repository");
const planService = require("./plan.service");

// ASSUMPTION — adjust to match your real Employee model/fields.
// This expects documents shaped like { companyId, status: "active" | ... }.
// If your Employee model instead uses `isActive: true/false`, or the
// companyId field is named differently, update countActiveEmployees() below
// — that's the only place this assumption is used.
const Employee = require("../models/employee.model");

class SubscriptionService {
  async countActiveEmployees(companyId) {
    return await Employee.countDocuments({ companyId, status: "active" });
  }

  _priceForCycle(plan, billingCycle) {
    if (plan.isCustomPricing) return 0; // Enterprise — set manually by super admin
    return billingCycle === "yearly"
      ? plan.yearlyPricePerEmployee
      : plan.monthlyPricePerEmployee;
  }

  _nextBillingDate(from, billingCycle) {
    const date = new Date(from);
    if (billingCycle === "yearly") {
      date.setFullYear(date.getFullYear() + 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    return date;
  }

  // Call this right after a new company is created (see INTEGRATION.md).
  async createFreeSubscription(companyId) {
    const freePlan = await planService.getOrCreateFreePlan();

    await subscriptionRepository.upsertForCompany(companyId, {
      planId: freePlan._id,
      billingCycle: "monthly",
      employeeCount: 0,
      pricePerEmployee: 0,
      totalAmount: 0,
      currency: "NPR",
      startDate: new Date(),
      nextBillingDate: null,
      status: "active",
    });

    return await subscriptionRepository.findByCompanyId(companyId);
  }

  async getCompanySubscription(companyId) {
    let subscription = await subscriptionRepository.findByCompanyId(companyId);

    if (!subscription) {
      // Safety net for companies that predate this feature, or if the
      // registration hook was skipped.
      subscription = await this.createFreeSubscription(companyId);
    }

    return subscription;
  }

  // Recomputes billing off the company's current active-employee count.
  // Call this from your Employee create/deactivate flow (see
  // INTEGRATION.md) so billing stays accurate as headcount changes, and it's
  // also called by GET /subscriptions/me so the admin always sees fresh
  // numbers.
  async syncEmployeeCount(companyId) {
    const subscription = await this.getCompanySubscription(companyId);
    const plan = subscription.planId; // populated

    const activeCount = await this.countActiveEmployees(companyId);
    const previousCount = subscription.employeeCount;
    const pricePerEmployee = this._priceForCycle(
      plan,
      subscription.billingCycle,
    );

    const totalAmount = plan.isCustomPricing
      ? subscription.totalAmount // Enterprise: left as whatever the super admin set
      : activeCount * pricePerEmployee;

    const additionalAmount =
      !plan.isCustomPricing && activeCount > previousCount
        ? (activeCount - previousCount) * pricePerEmployee
        : 0;

    const updated = await subscriptionRepository.update(subscription._id, {
      employeeCount: activeCount,
      totalAmount,
    });

    return { subscription: updated, additionalAmount };
  }

  // Call this before creating a new employee to enforce a plan's employee
  // cap (chiefly the Free plan's 10-employee limit). No-op for plans with no
  // maxEmployees (Business, Enterprise). Throws if the company is at/over
  // its limit — catch this in your employee-creation flow and surface it.
  async assertCanAddEmployee(companyId) {
    const subscription = await this.getCompanySubscription(companyId);
    const plan = subscription.planId;

    if (!plan.maxEmployees) return true;

    const activeCount = await this.countActiveEmployees(companyId);

    if (activeCount >= plan.maxEmployees) {
      throw new Error(
        `The ${plan.name} plan allows a maximum of ${plan.maxEmployees} active employees. Upgrade your plan to add more.`,
      );
    }

    return true;
  }

  // Company Admin subscribes to / changes plan. Price and employee count are
  // always computed here, server-side — never accept them from the request.
  async subscribe(companyId, { planId, billingCycle = "monthly" }) {
    const plan = await planRepository.findById(planId);

    if (!plan || !plan.isActive) {
      throw new Error("Selected plan is not available");
    }

    const activeCount = await this.countActiveEmployees(companyId);

    if (plan.maxEmployees && activeCount > plan.maxEmployees) {
      throw new Error(
        `This company currently has ${activeCount} active employees, which exceeds the ${plan.name} plan's limit of ${plan.maxEmployees}. Choose a higher plan.`,
      );
    }

    const pricePerEmployee = this._priceForCycle(plan, billingCycle);
    const totalAmount = plan.isCustomPricing
      ? 0
      : activeCount * pricePerEmployee;
    const startDate = new Date();

    await subscriptionRepository.upsertForCompany(companyId, {
      planId: plan._id,
      billingCycle,
      employeeCount: activeCount,
      pricePerEmployee,
      totalAmount,
      currency: "NPR",
      startDate,
      nextBillingDate:
        plan.slug === "free"
          ? null
          : this._nextBillingDate(startDate, billingCycle),
      status: "active",
    });

    return await subscriptionRepository.findByCompanyId(companyId);
  }

  async listSubscriptions(searchHelper) {
    return await subscriptionRepository.findAll(searchHelper);
  }

  // Super Admin manual override — mainly Enterprise custom pricing, or
  // correcting status (past_due / cancelled) and nextBillingDate.
  async adminUpdate(id, data) {
    const subscription = await subscriptionRepository.update(id, data);

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    return subscription;
  }
}

module.exports = new SubscriptionService();
