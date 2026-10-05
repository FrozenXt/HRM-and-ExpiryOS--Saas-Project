const AdvanceSalary = require("../models/advance-salary.model");

const listPopulate = {
  path: "employeeId",
  select: "userId id_int",
  populate: { path: "userId", select: "firstName lastName email" },
};

class AdvanceSalaryRepository {
  async findAll(searchHelper, scopeFilters = {}) {
    const filter = { ...searchHelper.getFilters(), ...scopeFilters };

    const [data, total] = await Promise.all([
      AdvanceSalary.find(filter)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit())
        .populate(listPopulate)
        .lean(),
      AdvanceSalary.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page: searchHelper.getPage(),
      limit: searchHelper.getLimit(),
    };
  }

  async findById(id) {
    return await AdvanceSalary.findById(id);
  }

  async create(data) {
    return await AdvanceSalary.create(data);
  }

  async update(id, data) {
    return await AdvanceSalary.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    );
  }

  async delete(id) {
    return await AdvanceSalary.findByIdAndDelete(id);
  }

  // Pending, or approved and still being recovered. Blocks a second request.
  async findOpenByEmployeeId(employeeId) {
    return await AdvanceSalary.findOne({
      employeeId,
      status: { $in: ["pending", "approved"] },
    });
  }

  // The advance payroll should deduct from right now.
  async findActiveByEmployeeId(employeeId) {
    return await AdvanceSalary.findOne({ employeeId, status: "approved" });
  }
}

module.exports = new AdvanceSalaryRepository();
