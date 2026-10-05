const MonitoringPolicy = require("../models/monitoring-policy.model");

class MonitoringPolicyRepository {
  async findByCompanyId(companyId) {
    return await MonitoringPolicy.findOne({ companyId });
  }
  async create(data) {
    return await MonitoringPolicy.create(data);
  }
  async updateBySet(id, setOps) {
    return await MonitoringPolicy.findByIdAndUpdate(
      id,
      { $set: setOps },
      { new: true, runValidators: true },
    );
  }
}

module.exports = new MonitoringPolicyRepository();
