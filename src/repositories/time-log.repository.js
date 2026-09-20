const TimeLog = require("../models/time-log.model");

class TimeLogRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      TimeLog.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      TimeLog.countDocuments(filters),
    ]);
    return { data, total };
  }
  async findById(id) {
    return await TimeLog.findById(id);
  }
  async create(data) {
    return await TimeLog.create(data);
  }
  async update(id, data) {
    return await TimeLog.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
  async delete(id) {
    return await TimeLog.findByIdAndDelete(id);
  }
}

module.exports = new TimeLogRepository();
