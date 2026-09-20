const PayrollStatutoryDeduction = require("../models/payroll-statutory-deduction.model");

class PayrollStatutoryDeductionRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      PayrollStatutoryDeduction.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      PayrollStatutoryDeduction.countDocuments(filters),
    ]);
    return { data, total };
  }
  async findById(id) {
    return await PayrollStatutoryDeduction.findById(id);
  }
  async findByPayrollId(payrollId) {
    return await PayrollStatutoryDeduction.findOne({ payrollId });
  }
  async create(data) {
    return await PayrollStatutoryDeduction.create(data);
  }
  async update(id, data) {
    return await PayrollStatutoryDeduction.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
  async delete(id) {
    return await PayrollStatutoryDeduction.findByIdAndDelete(id);
  }
}

module.exports = new PayrollStatutoryDeductionRepository();
