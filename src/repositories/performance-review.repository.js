const PerformanceReview = require("../models/performance-review.model");

const EMPLOYEE_POPULATE = {
  path: "employeeId",
  select: "id_int userId departmentId designationId",
  populate: [
    { path: "userId", select: "firstName lastName email" },
    { path: "departmentId", select: "name" },
    { path: "designationId", select: "name title" },
  ],
};
const REVIEWER_POPULATE = {
  path: "reviewerId",
  select: "firstName lastName email",
};

class PerformanceReviewRepository {
  async findAll(searchHelper, scopeFilter) {
    const filters = { ...searchHelper.getFilters(), ...scopeFilter };

    const [data, total] = await Promise.all([
      PerformanceReview.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit())
        .populate(EMPLOYEE_POPULATE)
        .populate(REVIEWER_POPULATE)
        .populate("companyId", "legalName")
        .lean(),
      PerformanceReview.countDocuments(filters),
    ]);

    return { data, total };
  }

  async findById(id, scopeFilter) {
    return await PerformanceReview.findOne({ _id: id, ...scopeFilter })
      .populate(EMPLOYEE_POPULATE)
      .populate(REVIEWER_POPULATE)
      .populate("companyId", "legalName");
  }

  async findByEmployeeAndPeriod(employeeId, reviewPeriod) {
    return await PerformanceReview.findOne({ employeeId, reviewPeriod });
  }

  async create(data) {
    return await PerformanceReview.create(data);
  }

  async update(id, scopeFilter, data) {
    return await PerformanceReview.findOneAndUpdate(
      { _id: id, ...scopeFilter },
      data,
      { new: true, runValidators: true },
    )
      .populate(EMPLOYEE_POPULATE)
      .populate(REVIEWER_POPULATE)
      .populate("companyId", "legalName");
  }

  async delete(id, scopeFilter) {
    return await PerformanceReview.findOneAndDelete({
      _id: id,
      ...scopeFilter,
    });
  }
}

module.exports = new PerformanceReviewRepository();
