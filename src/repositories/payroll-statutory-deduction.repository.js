const PayrollStatutoryDeduction = require("../models/payroll-statutory-deduction.model");
const Payroll = require("../models/payroll.model");

// Shared populate chain: payrollId -> its employeeId -> userId (person's
// name) + department/designation, plus payrollId's own companyId and
// currencyId. Kept as a function so findAll/findById/findByPayrollId all
// stay in sync if you ever add/remove a populated field.
function withDetails(query) {
  return query.populate({
    path: "payrollId",
    select:
      "employeeId companyId currencyId wageType period payableDays regularHours overtimeHours grossPay overtimePay deductions netPay status id_int",
    populate: [
      {
        path: "employeeId",
        select: "userId departmentId designationId id_int",
        populate: [
          { path: "userId", select: "firstName lastName email" },
          { path: "departmentId", select: "name" },
          { path: "designationId", select: "name" },
        ],
      },
      { path: "companyId", select: "legalName tradeName" },
      { path: "currencyId", select: "code name symbol" },
    ],
  });
}

class PayrollStatutoryDeductionRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      withDetails(
        PayrollStatutoryDeduction.find(filters)
          .sort(searchHelper.getSort())
          .skip(searchHelper.getSkip())
          .limit(searchHelper.getLimit()),
      ),
      PayrollStatutoryDeduction.countDocuments(filters),
    ]);
    return { data, total };
  }

  async findById(id) {
    return await withDetails(PayrollStatutoryDeduction.findById(id));
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

  // Write-through to the parent Payroll's deductions/netPay whenever a
  // breakdown is created or updated — this is what makes the payroll list's
  // Net Pay column actually reflect the statutory breakdown, instead of the
  // two staying independently-computed numbers that silently disagree.
  async syncPayrollTotals(payrollId) {
    const payroll = await Payroll.findById(payrollId);
    if (!payroll) return null;

    const deduction = await PayrollStatutoryDeduction.findOne({ payrollId });
    if (!deduction) return payroll;

    // Only what actually comes out of the employee's pay — employer PF/ESI
    // contributions and gratuity accrual are the company's cost, mirroring
    // the same exclusion StatutoryDeductionModal.jsx already applies for
    // employeeDeductedTotal on the frontend.
    const employeeDeductedTotal =
      (deduction.pfEmployeeContribution || 0) +
      (deduction.esiEmployeeContribution || 0) +
      (deduction.professionalTax || 0) +
      (deduction.tds || 0) +
      (deduction.otherDeductions || 0);

    payroll.deductions = employeeDeductedTotal;
    payroll.netPay =
      (payroll.grossPay || 0) +
      (payroll.overtimePay || 0) -
      employeeDeductedTotal;

    await payroll.save();
    return payroll;
  }
}

module.exports = new PayrollStatutoryDeductionRepository();
