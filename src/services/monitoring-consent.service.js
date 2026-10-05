const monitoringConsentRepository = require("../repositories/monitoring-consent.repository");
const employeeRepository = require("../repositories/employee.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

class MonitoringConsentService {
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
    return await monitoringConsentRepository.findAll(
      searchHelper,
      scopeFilters,
    );
  }

  async getById(id, actingUser) {
    const doc = await monitoringConsentRepository.findById(id);
    if (!doc) throw new Error("Monitoring consent not found");
    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Monitoring consent not found",
    );
    return doc;
  }

  // Consent is only ever recorded by the person being monitored — always
  // their OWN employee profile, never on behalf of someone else, and never
  // an employeeId taken from the request body. consentDate and ipAddress are
  // server-side so they can't be backdated or spoofed.
  async record(data, ipAddress, actingUser) {
    const employee = await this._getOwnEmployee(actingUser);

    const given = data.consentGiven === true || data.consentGiven === "true";
    const notGiven =
      data.consentGiven === false || data.consentGiven === "false";
    if (!given && !notGiven)
      throw new Error("consentGiven must be true or false");
    if (!data.policyVersion || !String(data.policyVersion).trim()) {
      throw new Error("policyVersion is required");
    }

    return await monitoringConsentRepository.create({
      employeeId: employee._id,
      companyId: employee.companyId,
      consentGiven: given,
      consentDate: new Date(),
      policyVersion: String(data.policyVersion).trim(),
      ipAddress: ipAddress ?? null,
    });
  }

  async getMyCurrent(actingUser) {
    const employee = await this._getOwnEmployee(actingUser);
    const latest = await monitoringConsentRepository.findLatestByEmployeeId(
      employee._id,
    );
    return { hasConsented: !!latest?.consentGiven, consent: latest };
  }

  // Used by ActivityLog + Screenshot ingestion — no monitoring data is
  // accepted for anyone whose latest consent record isn't a "yes".
  async assertConsentGiven(employeeId) {
    const latest =
      await monitoringConsentRepository.findLatestByEmployeeId(employeeId);
    if (!latest || !latest.consentGiven) {
      const error = new Error(
        "Monitoring consent has not been given for this employee",
      );
      error.statusCode = 403;
      throw error;
    }
  }
}

module.exports = new MonitoringConsentService();
