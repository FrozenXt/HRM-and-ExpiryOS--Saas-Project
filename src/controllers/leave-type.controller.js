const BaseTenantController = require("./base-tenant.controller");
const leaveTypeService = require("../services/leave-type.service");

module.exports = new BaseTenantController(leaveTypeService, "Leave type");
