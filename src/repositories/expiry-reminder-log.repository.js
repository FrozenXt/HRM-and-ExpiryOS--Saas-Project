const BaseTenantRepository = require("./base-tenant.repository");
const ExpiryReminderLog = require("../models/expiry-reminder-log.model");

class ExpiryReminderLogRepository extends BaseTenantRepository {
  constructor() {
    super(ExpiryReminderLog);
  }
}

module.exports = new ExpiryReminderLogRepository();
