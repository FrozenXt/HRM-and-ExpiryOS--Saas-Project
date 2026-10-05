const activityLogRepository = require("../repositories/activity-log.repository");
const employeeRepository = require("../repositories/employee.repository");
const monitoringConsentService = require("./monitoring-consent.service");
const monitoringPolicyService = require("./monitoring-policy.service");
const TenantScope = require("../helpers/tenant-scope.helper");

const MAX_BATCH = 500;
const LEVELS = ["active", "idle"];

class ActivityLogService {
  async _getOwnEmployee(actingUser) {
    const employee = await employeeRepository.findByUserId(actingUser._id);
    if (!employee)
      throw new Error("No employee profile found for this account");
    return employee;
  }

  async _getActingEmployeeId(actingUser) {
    if (actingUser.role !== "staff") return null;
    return (await this._getOwnEmployee(actingUser))._id;
  }

  async getAll(searchHelper, actingUser) {
    const employeeId = await this._getActingEmployeeId(actingUser);
    const scopeFilters = TenantScope.scopeToOwnEmployee(
      actingUser,
      {},
      employeeId,
    );
    return await activityLogRepository.findAll(searchHelper, scopeFilters);
  }

  async getById(id, actingUser) {
    const doc = await activityLogRepository.findById(id);
    if (!doc) throw new Error("Activity log not found");
    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Activity log not found",
    );
    return doc;
  }

  // Accepts either a single entry or { entries: [...] } (up to 500) — the
  // device agent normally flushes a batch. Always written against the
  // caller's OWN employee profile, and only if they've given consent.
  async ingest(body, actingUser) {
    const employee = await this._getOwnEmployee(actingUser);
    await monitoringPolicyService.assertFeatureEnabled(
      employee.companyId,
      "activityTrackingEnabled",
      "Activity tracking",
    );
    await monitoringConsentService.assertConsentGiven(employee._id);

    const isBatch = Array.isArray(body.entries);
    const entries = isBatch ? body.entries : [body];

    if (entries.length === 0) throw new Error("entries must not be empty");
    if (entries.length > MAX_BATCH)
      throw new Error(
        `A single request can contain at most ${MAX_BATCH} entries`,
      );

    const docs = entries.map((e, i) => {
      if (!e.sessionId) throw new Error(`entries[${i}].sessionId is required`);
      if (!LEVELS.includes(e.activityLevel)) {
        throw new Error(
          `entries[${i}].activityLevel must be one of: ${LEVELS.join(", ")}`,
        );
      }
      return {
        employeeId: employee._id,
        companyId: employee.companyId,
        sessionId: e.sessionId,
        timestamp: e.timestamp ?? new Date(),
        activityLevel: e.activityLevel,
        keystrokeCount: e.keystrokeCount ?? null,
        mouseEventCount: e.mouseEventCount ?? null,
        activeAppName: e.activeAppName ?? null,
        activeWindowTitle: e.activeWindowTitle ?? null,
      };
    });

    const created = await activityLogRepository.createMany(docs);
    return isBatch ? created : created[0];
  }
}

module.exports = new ActivityLogService();
