const BaseTenantService = require("./base-tenant.service");
const expenseCategoryRepository = require("../repositories/expense-category.repository");
const expenseClaimRepository = require("../repositories/expense-claim.repository");

class ExpenseCategoryService extends BaseTenantService {
  constructor() {
    super(expenseCategoryRepository, "Expense category not found", ["name"]);
  }

  async remove(id, actingUser) {
    // Mongo has no foreign keys — check ourselves so a category can't be
    // deleted while claims still reference it.
    const isInUse = await expenseClaimRepository.existsByCategoryId(id);
    if (isInUse) {
      const error = new Error(
        "This expense category has claims against it and cannot be deleted",
      );
      error.statusCode = 409;
      throw error;
    }
    return await super.remove(id, actingUser);
  }
}

module.exports = new ExpenseCategoryService();
