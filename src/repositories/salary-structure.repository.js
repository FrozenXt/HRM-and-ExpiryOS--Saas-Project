const SalaryStructure = require("../models/salary-structure.model");
const Currency = require("../models/currency.model");
const { attachEmployeeInfo } = require("../helpers/employee-info.helper");

const uid = (v) => (v && v._id ? v._id : v)?.toString();
const sumAmounts = (items) =>
  (items || []).reduce((n, i) => n + (Number(i?.amount) || 0), 0);

class SalaryStructureRepository {
  // Adds employee name/photo/department, currency details and totals to each
  // structure. Existing fields are untouched.
  async enrich(records) {
    const list = await attachEmployeeInfo(records);

    const currencyIds = [
      ...new Set(list.map((r) => uid(r.currencyId)).filter(Boolean)),
    ];
    const currencies = currencyIds.length
      ? await Currency.find({ _id: { $in: currencyIds } }).lean()
      : [];
    const currencyMap = new Map(currencies.map((c) => [uid(c._id), c]));

    return list.map((r) => {
      const c = currencyMap.get(uid(r.currencyId));
      return {
        ...r,
        currency: c
          ? {
              _id: c._id,
              code: c.code ?? null,
              symbol: c.symbol ?? null,
              name: c.name ?? null,
            }
          : null,
        totalAllowances: sumAmounts(r.allowances),
        totalDeductions: sumAmounts(r.deductions),
      };
    });
  }

  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      SalaryStructure.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      SalaryStructure.countDocuments(filters),
    ]);
    return { data: await this.enrich(data), total };
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
