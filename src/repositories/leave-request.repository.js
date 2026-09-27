// repositories/leave-request.repository.js
const LeaveRequest = require("../models/leave-request.model");

// Shared populate chain: leaveTypeId -> name (what this whole change is
// for), plus employeeId -> its userId for the requester's name, so
// admin/hr views don't need a separate employees/users lookup either.
function withDetails(query) {
  return query
    .populate("leaveTypeId", "name annualQuota carryForward")
    .populate({
      path: "employeeId",
      select: "userId departmentId designationId id_int",
      populate: [
        { path: "userId", select: "firstName lastName email" },
        { path: "departmentId", select: "name" },
        { path: "designationId", select: "name" },
      ],
    });
}

class LeaveRequestRepository {
  async findAll(searchHelper, scopeFilter) {
    const filters = { ...searchHelper.getFilters(), ...scopeFilter };

    const [data, total] = await Promise.all([
      withDetails(
        LeaveRequest.find(filters)
          .sort(searchHelper.getSort())
          .skip(searchHelper.getSkip())
          .limit(searchHelper.getLimit()),
      ),
      LeaveRequest.countDocuments(filters),
    ]);

    return { data, total };
  }

  async findById(id, scopeFilter) {
    return await withDetails(LeaveRequest.findOne({ _id: id, ...scopeFilter }));
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
