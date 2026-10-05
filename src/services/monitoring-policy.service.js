const monitoringPolicyRepository = require("../repositories/monitoring-policy.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

const WRITABLE_FIELDS = [
  "country",
  "screenshotEnabled",
  "screenshotIntervalMinutes",
  "locationTrackingEnabled",
  "geofencingEnabled",
  "activityTrackingEnabled",
  "retentionDays",
];

class MonitoringPolicyService {
  async getPolicy(actingUser, requestedCompanyId) {
    const companyId = TenantScope.resolveCompanyId(
      actingUser,
      requestedCompanyId,
    );

    let policy = await monitoringPolicyRepository.findByCompanyId(companyId);
    if (!policy) {
      // Lazy-create on first access — every toggle defaults to off, so a
      // company is never monitored until someone explicitly turns it on.
      policy = await monitoringPolicyRepository.create({ companyId });
    }
    return policy;
  }

  async updatePolicy(data, actingUser) {
    const { companyId: requestedCompanyId, ...updates } = data;
    const companyId = TenantScope.resolveCompanyId(
      actingUser,
      requestedCompanyId,
    );

    let policy = await monitoringPolicyRepository.findByCompanyId(companyId);
    if (!policy) {
      policy = await monitoringPolicyRepository.create({ companyId });
    }

    if (
      updates.screenshotIntervalMinutes != null &&
      updates.screenshotIntervalMinutes <= 0
    ) {
      throw new Error("screenshotIntervalMinutes must be greater than 0");
    }
    if (updates.retentionDays != null && updates.retentionDays <= 0) {
      throw new Error("retentionDays must be greater than 0");
    }

    const setOps = {};
    for (const field of WRITABLE_FIELDS) {
      if (updates[field] !== undefined) setOps[field] = updates[field];
    }

    if (Object.keys(setOps).length === 0) return policy;

    return await monitoringPolicyRepository.updateBySet(policy._id, setOps);
  }

  // Used by ActivityLog/Screenshot ingestion — the company-level master
  // switch, separate from and in addition to the individual employee's
  // MonitoringConsent. Both have to be "yes" for data to be accepted.
  async assertFeatureEnabled(companyId, field, featureLabel) {
    const policy = await monitoringPolicyRepository.findByCompanyId(companyId);
    if (!policy || !policy[field]) {
      const error = new Error(
        `${featureLabel} is not enabled for this company`,
      );
      error.statusCode = 403;
      throw error;
    }
  }
}

module.exports = new MonitoringPolicyService();
