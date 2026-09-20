const SalaryStructure = require("../models/salary-structure.model");

class SalaryStructureRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      SalaryStructure.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      SalaryStructure.countDocuments(filters),
    ]);
    return { data, total };
  }
  async findById(id) {
    return await SalaryStructure.findById(id);
  }
  async findByEmployeeId(employeeId) {
    return await SalaryStructure.findOne({ employeeId });
  }
  async create(data) {
    return await SalaryStructure.create(data);
  }
  async update(id, data) {
    return await SalaryStructure.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
  async delete(id) {
    return await SalaryStructure.findByIdAndDelete(id);
  }
}

module.exports = new SalaryStructureRepository();
