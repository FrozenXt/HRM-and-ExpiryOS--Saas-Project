// repositories/leave-request.repository.js
const LeaveRequest = require("../models/leave-request.model");

class LeaveRequestRepository {
  async findAll(searchHelper, scopeFilter) {
    const filters = { ...searchHelper.getFilters(), ...scopeFilter };

    const [data, total] = await Promise.all([
      LeaveRequest.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      LeaveRequest.countDocuments(filters),
    ]);

    return { data, total };
  }

  async findById(id, scopeFilter) {
    return await LeaveRequest.findOne({ _id: id, ...scopeFilter });
  }

  async create(data) {
    return await LeaveRequest.create(data);
  }

  async update(id, scopeFilter, data) {
    return await LeaveRequest.findOneAndUpdate(
      { _id: id, ...scopeFilter },
      data,
      {
        new: true,
        runValidators: true,
      },
    );
  }

  async delete(id, scopeFilter) {
    return await LeaveRequest.findOneAndDelete({ _id: id, ...scopeFilter });
  }
}

module.exports = new LeaveRequestRepository();
