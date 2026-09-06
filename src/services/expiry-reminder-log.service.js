const BaseTenantService = require("./base-tenant.service");
const expiryReminderLogRepository = require("../repositories/expiry-reminder-log.repository");

// Read-only from the API's perspective — entries are written by the
// scheduled expiry-sweep job (see the note in document.service.js), not
// through this service. create()/update()/remove() are inherited from
// BaseTenantService but deliberately not wired to any route below.
class ExpiryReminderLogService extends BaseTenantService {
  constructor() {
    super(expiryReminderLogRepository, "Expiry reminder log not found");
  }
}

module.exports = new ExpiryReminderLogService();
