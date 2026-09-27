const OnboardingTask = require("../models/onboarding-task.model");

const EMPLOYEE_POPULATE = {
  path: "employeeId",
  select: "id_int userId departmentId designationId",
  populate: [
    { path: "userId", select: "firstName lastName email" },
    { path: "departmentId", select: "name" },
    { path: "designationId", select: "name title" },
  ],
};
const ASSIGNEE_POPULATE = {
  path: "assignedTo",
  select: "firstName lastName email",
};

class OnboardingTaskRepository {
  async findAll(searchHelper, scopeFilter) {
    const filters = { ...searchHelper.getFilters(), ...scopeFilter };

    const [data, total] = await Promise.all([
      OnboardingTask.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit())
        .populate(EMPLOYEE_POPULATE)
        .populate(ASSIGNEE_POPULATE)
        .populate("companyId", "legalName")
        .lean(),
      OnboardingTask.countDocuments(filters),
    ]);

    return { data, total };
  }

  async findById(id, scopeFilter) {
    return await OnboardingTask.findOne({ _id: id, ...scopeFilter })
      .populate(EMPLOYEE_POPULATE)
      .populate(ASSIGNEE_POPULATE)
      .populate("companyId", "legalName");
  }

  async create(data) {
    return await OnboardingTask.create(data);
  }

  async update(id, scopeFilter, data) {
    return await OnboardingTask.findOneAndUpdate(
      { _id: id, ...scopeFilter },
      data,
      { new: true, runValidators: true },
    )
      .populate(EMPLOYEE_POPULATE)
      .populate(ASSIGNEE_POPULATE)
      .populate("companyId", "legalName");
  }

  async delete(id, scopeFilter) {
    return await OnboardingTask.findOneAndDelete({ _id: id, ...scopeFilter });
  }
}

module.exports = new OnboardingTaskRepository();
