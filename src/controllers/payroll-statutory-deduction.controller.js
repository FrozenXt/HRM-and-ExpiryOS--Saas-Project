const BaseTenantController = require("./base-tenant.controller");
const payrollStatutoryDeductionService = require("../services/payroll-statutory-deduction.service");

module.exports = new BaseTenantController(
  payrollStatutoryDeductionService,
  "Payroll statutory deduction",
);
