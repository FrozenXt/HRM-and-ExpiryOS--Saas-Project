const ActivityLog = require("../models/activity-log.model");

class ActivityLogRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      ActivityLog.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      ActivityLog.countDocuments(filters),
    ]);
    return { data, total };
  }
  async findById(id) {
    return await ActivityLog.findById(id);
  }
  async createMany(docs) {
    return await ActivityLog.insertMany(docs);
  }
}

module.exports = new ActivityLogRepository();
