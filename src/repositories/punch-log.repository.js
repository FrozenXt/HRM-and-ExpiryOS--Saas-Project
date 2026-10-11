const BaseTenantRepository = require("./base-tenant.repository");
const PunchLog = require("../models/punch-log.model");

// PunchLog is append-only. No update, no delete via this repository —
// corrections belong on Attendance, not on the raw punch trail.
class PunchLogRepository extends BaseTenantRepository {
  constructor() {
    super(PunchLog);
  }

  // Every tap, accepted or rejected.
  async record(data) {
    return await this.Model.create(data);
  }

  // Recent punches for a company, newest first. Backs the live kiosk board.
  async findRecentByCompany(companyId, { limit = 50, since = null } = {}) {
    const filter = { companyId };
    if (since) filter.punchedAt = { $gte: since };

    return await this.Model.find(filter).sort({ punchedAt: -1 }).limit(limit);
  }

  // One employee's punch history.
  async findByEmployee(employeeId, { limit = 100, since = null } = {}) {
    const filter = { employeeId };
    if (since) filter.punchedAt = { $gte: since };

    return await this.Model.find(filter).sort({ punchedAt: -1 }).limit(limit);
  }

  // Cheap pre-check: has this employee already punched "in" (or "out") today?
  async countTodayByEmployee(employeeId, type, startOfDay) {
    return await this.Model.countDocuments({
      employeeId,
      type,
      result: "accepted",
      punchedAt: { $gte: startOfDay },
    });
  }
}

module.exports = new PunchLogRepository();
