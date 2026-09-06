const BaseTenantController = require("./base-tenant.controller");
const departmentService = require("../services/department.service");

module.exports = new BaseTenantController(departmentService, "Department");
