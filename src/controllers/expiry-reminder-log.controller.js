const BaseTenantController = require("./base-tenant.controller");
const expiryReminderLogService = require("../services/expiry-reminder-log.service");

module.exports = new BaseTenantController(
  expiryReminderLogService,
  "Expiry reminder log",
);
