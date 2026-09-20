const Payroll = require("../models/payroll.model");

class PayrollRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      Payroll.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      Payroll.countDocuments(filters),
    ]);
    return { data, total };
  }
  async findById(id) {
    return await Payroll.findById(id);
  }
  async findByEmployeeAndPeriod(employeeId, period) {
    return await Payroll.findOne({ employeeId, period });
  }
  async create(data) {
    return await Payroll.create(data);
  }
  async update(id, data) {
    return await Payroll.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
  async delete(id) {
    return await Payroll.findByIdAndDelete(id);
  }
}

module.exports = new PayrollRepository();
