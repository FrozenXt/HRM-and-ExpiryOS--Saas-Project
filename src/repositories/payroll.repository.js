const Payroll = require("../models/payroll.model");
const Currency = require("../models/currency.model");
const User = require("../models/user.model");
const { attachEmployeeInfo } = require("../helpers/employee-info.helper");

const uid = (v) => (v && v._id ? v._id : v)?.toString();
const fullName = (u) =>
  u ? `${u.firstName} ${u.lastName || ""}`.trim() : null;

class PayrollRepository {
  async enrich(records) {
    const list = await attachEmployeeInfo(records);

    const currencyIds = [
      ...new Set(list.map((r) => uid(r.currencyId)).filter(Boolean)),
    ];
    const approverIds = [
      ...new Set(list.map((r) => uid(r.approvedBy)).filter(Boolean)),
    ];

    const [currencies, approvers] = await Promise.all([
      currencyIds.length
        ? Currency.find({ _id: { $in: currencyIds } }).lean()
        : [],
      approverIds.length
        ? User.find({ _id: { $in: approverIds } })
            .select("firstName lastName profileImage")
            .lean()
        : [],
    ]);

    const currencyMap = new Map(currencies.map((c) => [uid(c._id), c]));
    const approverMap = new Map(approvers.map((u) => [uid(u._id), u]));

    return list.map((r) => {
      const c = currencyMap.get(uid(r.currencyId));
      const approver = approverMap.get(uid(r.approvedBy));
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
        approvedByName: fullName(approver),
        approvedByImage: approver?.profileImage ?? null,
        hasPayslip: !!r.payslipUrl,
      };
    });
  }

  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      Payroll.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      Payroll.countDocuments(filters),
    ]);
    return { data: await this.enrich(data), total };
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
