const BaseTenantRepository = require("./base-tenant.repository");
const ExpenseCategory = require("../models/expense-category.model");

class ExpenseCategoryRepository extends BaseTenantRepository {
  constructor() {
    super(ExpenseCategory);
  }
}

module.exports = new ExpenseCategoryRepository();
