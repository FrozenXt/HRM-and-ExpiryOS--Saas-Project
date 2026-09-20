const BaseTenantController = require("./base-tenant.controller");
const employeeStatutoryDetailService = require("../services/employee-statutory-detail.service");

module.exports = new BaseTenantController(
  employeeStatutoryDetailService,
  "Employee statutory detail",
);
