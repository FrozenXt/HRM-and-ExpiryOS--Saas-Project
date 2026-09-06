const BaseTenantController = require("./base-tenant.controller");
const designationService = require("../services/designation.service");

module.exports = new BaseTenantController(designationService, "Designation");
