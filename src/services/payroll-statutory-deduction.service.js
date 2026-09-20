const payrollStatutoryDeductionRepository = require("../repositories/payroll-statutory-deduction.repository");
const payrollRepository = require("../repositories/payroll.repository");
const employeeRepository = require("../repositories/employee.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

class PayrollStatutoryDeductionService {
  async _getActingEmployeeId(actingUser) {
    if (actingUser.role !== "staff") return null;
    const employee = await employeeRepository.findByUserId(actingUser._id);
    if (!employee)
      throw new Error("No employee profile found for this account");
    return employee._id;
  }

  // A deduction breakdown has no employeeId of its own — access is via its
  // parent Payroll's employeeId, fetched alongside.
  async _assertAccessViaPayroll(actingUser, doc) {
    const payroll = await payrollRepository.findById(doc.payrollId);
    if (!payroll) return; // orphaned record — fall through to company-level check below
    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      payroll,
      employeeId,
      "Payroll statutory deduction not found",
    );
  }

  async getAll(searchHelper, actingUser) {
    const scopeFilters = TenantScope.scopeFilters(actingUser);
    // NOTE: company-level only here, not employee-level — filtering a list
    // down to "my own" would need a join back through Payroll for every
    // row. Staff access to individual records is still locked down via
    // getById below; this just means staff shouldn't be routed to this
    // list endpoint at all (see routes — admin/hr/super_admin only).
    return await payrollStatutoryDeductionRepository.findAll(
      searchHelper,
      scopeFilters,
    );
  }

  async getById(id, actingUser) {
    const doc = await payrollStatutoryDeductionRepository.findById(id);
    if (!doc) throw new Error("Payroll statutory deduction not found");
    TenantScope.assertAccess(
      actingUser,
      doc,
      "Payroll statutory deduction not found",
    );
    return doc;
  }

  async create(data, actingUser) {
    const payroll = await payrollRepository.findById(data.payrollId);
    if (!payroll)
      throw new Error("payrollId does not refer to an existing payroll record");

    TenantScope.assertAccess(
      actingUser,
      payroll,
      "payrollId does not refer to an existing payroll record",
    );

    const existing = await payrollStatutoryDeductionRepository.findByPayrollId(
      data.payrollId,
    );
    if (existing) {
      throw new Error(
        "A statutory deduction breakdown already exists for this payroll record — update it instead",
      );
    }

    return await payrollStatutoryDeductionRepository.create({
      ...data,
      companyId: payroll.companyId,
    });
  }

  async update(id, data, actingUser) {
    const doc = await payrollStatutoryDeductionRepository.findById(id);
    if (!doc) throw new Error("Payroll statutory deduction not found");
    TenantScope.assertAccess(
      actingUser,
      doc,
      "Payroll statutory deduction not found",
    );

    const { payrollId, companyId, ...safeData } = data;
    return await payrollStatutoryDeductionRepository.update(id, safeData);
  }

  async remove(id, actingUser) {
    const doc = await payrollStatutoryDeductionRepository.findById(id);
    if (!doc) throw new Error("Payroll statutory deduction not found");
    TenantScope.assertAccess(
      actingUser,
      doc,
      "Payroll statutory deduction not found",
    );
    await payrollStatutoryDeductionRepository.delete(id);
    return doc;
  }
}

module.exports = new PayrollStatutoryDeductionService();
