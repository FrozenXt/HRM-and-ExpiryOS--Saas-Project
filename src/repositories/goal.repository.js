const Goal = require("../models/goal.model");

// Nested populate: employeeId -> the linked user (name/email) and, where
// present, department/designation names — so the frontend list doesn't need
// a second round-trip just to show "who" a goal belongs to.
const EMPLOYEE_POPULATE = {
  path: "employeeId",
  select: "id_int userId departmentId designationId",
  populate: [
    { path: "userId", select: "firstName lastName email" },
    { path: "departmentId", select: "name" },
    { path: "designationId", select: "name title" },
  ],
};

class GoalRepository {
  async findAll(searchHelper, scopeFilter) {
    const filters = { ...searchHelper.getFilters(), ...scopeFilter };

    const [data, total] = await Promise.all([
      Goal.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit())
        .populate(EMPLOYEE_POPULATE)
        .populate("companyId", "legalName")
        .lean(),
      Goal.countDocuments(filters),
    ]);

    return { data, total };
  }

  async findById(id, scopeFilter) {
    return await Goal.findOne({ _id: id, ...scopeFilter })
      .populate(EMPLOYEE_POPULATE)
      .populate("companyId", "legalName");
  }

  async create(data) {
    return await Goal.create(data);
  }

  async update(id, scopeFilter, data) {
    return await Goal.findOneAndUpdate({ _id: id, ...scopeFilter }, data, {
      new: true,
      runValidators: true,
    })
      .populate(EMPLOYEE_POPULATE)
      .populate("companyId", "legalName");
  }

  async delete(id, scopeFilter) {
    return await Goal.findOneAndDelete({ _id: id, ...scopeFilter });
  }
}

module.exports = new GoalRepository();
