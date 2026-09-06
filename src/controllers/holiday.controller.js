const BaseTenantController = require("./base-tenant.controller");
const holidayService = require("../services/holiday.service");

module.exports = new BaseTenantController(holidayService, "Holiday");
