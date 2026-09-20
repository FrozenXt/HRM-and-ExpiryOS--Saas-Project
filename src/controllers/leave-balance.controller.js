// controllers/leave-balance.controller.js
const BaseTenantController = require("./base-tenant.controller");
const leaveBalanceService = require("../services/leave-balance.service");

module.exports = new BaseTenantController(leaveBalanceService, "Leave balance");
