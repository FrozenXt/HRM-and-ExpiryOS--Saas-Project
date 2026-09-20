const payrollRepository = require("../repositories/payroll.repository");
const employeeRepository = require("../repositories/employee.repository");
const currencyRepository = require("../repositories/currency.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

class PayrollService {
  async _getActingEmployeeId(actingUser) {
    if (actingUser.role !== "staff") return null;
    const employee = await employeeRepository.findByUserId(actingUser._id);
    if (!employee)
      throw new Error("No employee profile found for this account");
    return employee._id;
  }

  _assertAmountsConsistent({ grossPay, overtimePay, deductions, netPay }) {
    const expectedNet = grossPay + (overtimePay || 0) - deductions;
    // Allow a tiny float rounding tolerance.
    if (Math.abs(expectedNet - netPay) > 0.01) {
      throw new Error("netPay must equal grossPay + overtimePay - deductions");
    }
  }

  async getAll(searchHelper, actingUser) {
    const employeeId = await this._getActingEmployeeId(actingUser);
    const scopeFilters = TenantScope.scopeToOwnEmployee(
      actingUser,
      {},
      employeeId,
    );
    return await payrollRepository.findAll(searchHelper, scopeFilters);
  }

  async getById(id, actingUser) {
    const doc = await payrollRepository.findById(id);
    if (!doc) throw new Error("Payroll not found");
    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Payroll not found",
    );
    return doc;
  }

  // Admin/HR/Super Admin only — enforced at the route layer.
  async create(data, actingUser) {
    if (!PERIOD_RE.test(data.period)) {
      throw new Error("period must be in YYYY-MM format");
    }

    const companyId = TenantScope.resolveCompanyId(actingUser, data.companyId);

    const employee = await employeeRepository.findById(data.employeeId);
    if (!employee || employee.companyId.toString() !== companyId.toString()) {
      throw new Error("employeeId must belong to the same company");
    }

    const currency = await currencyRepository.findById(data.currencyId);
    if (!currency)
      throw new Error("currencyId does not refer to an existing currency");

    const existing = await payrollRepository.findByEmployeeAndPeriod(
      data.employeeId,
      data.period,
    );
    if (existing)
      throw new Error(
        "A payroll record for this employee and period already exists",
      );

    this._assertAmountsConsistent(data);

    return await payrollRepository.create({
      ...data,
      companyId,
      status: "draft",
    });
  }

  async update(id, data, actingUser) {
    const doc = await payrollRepository.findById(id);
    if (!doc) throw new Error("Payroll not found");
    TenantScope.assertAccess(actingUser, doc, "Payroll not found");

    if (doc.status !== "draft") {
      throw new Error("Only a draft payroll record can be edited");
    }

    const {
      employeeId,
      companyId,
      period,
      status,
      approvedBy,
      payslipUrl,
      ...safeData
    } = data;

    const merged = {
      grossPay: safeData.grossPay ?? doc.grossPay,
      overtimePay: safeData.overtimePay ?? doc.overtimePay,
      deductions: safeData.deductions ?? doc.deductions,
      netPay: safeData.netPay ?? doc.netPay,
    };
    this._assertAmountsConsistent(merged);

    return await payrollRepository.update(id, safeData);
  }

  async remove(id, actingUser) {
    const doc = await payrollRepository.findById(id);
    if (!doc) throw new Error("Payroll not found");
    TenantScope.assertAccess(actingUser, doc, "Payroll not found");

    if (doc.status !== "draft") {
      throw new Error("Only a draft payroll record can be deleted");
    }

    await payrollRepository.delete(id);
    return doc;
  }

  async approve(id, actingUser) {
    const doc = await payrollRepository.findById(id);
    if (!doc) throw new Error("Payroll not found");
    TenantScope.assertAccess(actingUser, doc, "Payroll not found");

    if (doc.status !== "draft") {
      throw new Error("Only a draft payroll record can be approved");
    }

    return await payrollRepository.update(id, {
      status: "approved",
      approvedBy: actingUser._id,
    });
  }

  async release(id, file, actingUser) {
    const doc = await payrollRepository.findById(id);
    if (!doc) throw new Error("Payroll not found");
    TenantScope.assertAccess(actingUser, doc, "Payroll not found");

    if (doc.status !== "approved") {
      throw new Error("Only an approved payroll record can be released");
    }

    const update = { status: "released" };
    if (file) update.payslipUrl = `/uploads/payslips/${file.filename}`;

    return await payrollRepository.update(id, update);
  }
}

module.exports = new PayrollService();
