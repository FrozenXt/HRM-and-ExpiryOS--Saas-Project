const LocationTrace = require("../models/location-trace.model");

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
const SESSION_POPULATE = {
  path: "sessionId",
  select:
    "id_int deviceId deviceType os appVersion sessionStart sessionEnd ipAddress",
};

class LocationTraceRepository {
  async findAll(searchHelper, scopeFilter) {
    const filters = { ...searchHelper.getFilters(), ...scopeFilter };

    const [data, total] = await Promise.all([
      LocationTrace.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit())
        .populate(EMPLOYEE_POPULATE)
        .populate(COMPANY_POPULATE)
        .populate(SESSION_POPULATE)
        .lean(),
      LocationTrace.countDocuments(filters),
    ]);

    return { data, total };
  }

  async findById(id, scopeFilter) {
    return await LocationTrace.findOne({ _id: id, ...scopeFilter })
      .populate(EMPLOYEE_POPULATE)
      .populate(COMPANY_POPULATE)
      .populate(SESSION_POPULATE);
  }

  async create(data) {
    return await LocationTrace.create(data);
  }

  async delete(id, scopeFilter) {
    return await LocationTrace.findOneAndDelete({ _id: id, ...scopeFilter });
  }
}

module.exports = new LocationTraceRepository();
