const MonitoringConsent = require("../models/monitoring-consent.model");

class MonitoringConsentRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      MonitoringConsent.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      MonitoringConsent.countDocuments(filters),
    ]);
    return { data, total };
  }
  async findById(id) {
    return await MonitoringConsent.findById(id);
  }
  async findLatestByEmployeeId(employeeId) {
    return await MonitoringConsent.findOne({ employeeId }).sort({
      consentDate: -1,
      _id: -1,
    });
  }
  async create(data) {
    return await MonitoringConsent.create(data);
  }
}

module.exports = new MonitoringConsentRepository();
