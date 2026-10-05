const DeviceSession = require("../models/device-session.model");

const EMPLOYEE_POPULATE = {
  path: "employeeId",
  select: "id_int userId departmentId designationId status",
  populate: [
    { path: "userId", select: "firstName lastName email" },
    { path: "departmentId", select: "name" },
    { path: "designationId", select: "name title" },
  ],
};
const COMPANY_POPULATE = {
  path: "companyId",
  select: "id_int legalName tradeName",
};

class DeviceSessionRepository {
  async findAll(searchHelper, scopeFilter) {
    const filters = { ...searchHelper.getFilters(), ...scopeFilter };

    const [data, total] = await Promise.all([
      DeviceSession.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit())
        .populate(EMPLOYEE_POPULATE)
        .populate(COMPANY_POPULATE)
        .lean(),
      DeviceSession.countDocuments(filters),
    ]);

    return { data, total };
  }

  async findById(id, scopeFilter) {
    return await DeviceSession.findOne({ _id: id, ...scopeFilter })
      .populate(EMPLOYEE_POPULATE)
      .populate(COMPANY_POPULATE);
  }

  async create(data) {
    return await DeviceSession.create(data);
  }

  async update(id, scopeFilter, data) {
    return await DeviceSession.findOneAndUpdate(
      { _id: id, ...scopeFilter },
      data,
      { new: true, runValidators: true },
    )
      .populate(EMPLOYEE_POPULATE)
      .populate(COMPANY_POPULATE);
  }

  async closeOpenForDevice(employeeId, deviceId, sessionEnd) {
    return await DeviceSession.updateMany(
      { employeeId, deviceId, sessionEnd: null },
      { sessionEnd },
    );
  }

  async closeById(id, sessionEnd) {
    return await DeviceSession.updateOne(
      { _id: id, sessionEnd: null },
      { sessionEnd },
    );
  }

  async delete(id, scopeFilter) {
    return await DeviceSession.findOneAndDelete({ _id: id, ...scopeFilter });
  }
}

module.exports = new DeviceSessionRepository();
