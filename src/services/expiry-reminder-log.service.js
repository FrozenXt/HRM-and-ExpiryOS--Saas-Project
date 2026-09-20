const BaseTenantService = require("./base-tenant.service");
const expiryReminderLogRepository = require("../repositories/expiry-reminder-log.repository");

class ExpiryReminderLogService extends BaseTenantService {
  constructor() {
    super(expiryReminderLogRepository, "Expiry reminder log not found");
  }
}

module.exports = new ExpiryReminderLogService();
