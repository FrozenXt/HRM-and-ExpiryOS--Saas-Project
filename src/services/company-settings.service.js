const companySettingsRepository = require("../repositories/company-settings.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

const NESTED_KEYS = [
  "workingHours",
  "attendancePolicy",
  "branding",
  "mailSettings",
  "countrySettings",
  "notifications",
];

function flatten(prefix, obj, out) {
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[`${prefix}.${key}`] = value;
  }
}

class CompanySettingsService {
  async getSettings(actingUser, requestedCompanyId) {
    const companyId = TenantScope.resolveCompanyId(
      actingUser,
      requestedCompanyId,
    );

    let settings = await companySettingsRepository.findByCompanyId(companyId);
    if (!settings) {
      // Lazy-create on first access — schema defaults cover sensible
      // starting values (9-6, Sat/Sun off, 8hr full day, 4hr half day, etc).
      settings = await companySettingsRepository.create({ companyId });
    }
    return settings;
  }

  async updateSettings(data, actingUser) {
    const { companyId: requestedCompanyId, ...updates } = data;
    const companyId = TenantScope.resolveCompanyId(
      actingUser,
      requestedCompanyId,
    );

    let settings = await companySettingsRepository.findByCompanyId(companyId);
    if (!settings) {
      settings = await companySettingsRepository.create({ companyId });
    }

    const setOps = {};
    for (const key of NESTED_KEYS) {
      if (updates[key] && typeof updates[key] === "object") {
        flatten(key, updates[key], setOps);
      }
    }
    if (updates.weekOff !== undefined) setOps.weekOff = updates.weekOff;
    if (updates.financialYearStartMonth !== undefined)
      setOps.financialYearStartMonth = updates.financialYearStartMonth;

    if (Object.keys(setOps).length === 0) return settings;

    return await companySettingsRepository.updateBySet(settings._id, setOps);
  }
}

module.exports = new CompanySettingsService();
