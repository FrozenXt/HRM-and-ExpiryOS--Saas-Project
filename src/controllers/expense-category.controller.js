const BaseTenantController = require("./base-tenant.controller");
const expenseCategoryService = require("../services/expense-category.service");

module.exports = new BaseTenantController(
  expenseCategoryService,
  "Expense category",
);
