const BaseTenantController = require("./base-tenant.controller");
const salaryStructureService = require("../services/salary-structure.service");

module.exports = new BaseTenantController(
  salaryStructureService,
  "Salary structure",
);
