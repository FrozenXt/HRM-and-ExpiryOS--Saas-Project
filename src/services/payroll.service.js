const path = require("path");
const fs = require("fs");
const payrollRepository = require("../repositories/payroll.repository");
const employeeRepository = require("../repositories/employee.repository");
const currencyRepository = require("../repositories/currency.repository");
const payrollStatutoryDeductionRepository = require("../repositories/payroll-statutory-deduction.repository");
const TenantScope = require("../helpers/tenant-scope.helper");
const payslipService = require("./payslip.service");
const { notify, notifyBulk } = require("./notification.service");
const User = require("../models/user.model");
const Employee = require("../models/employee.model");

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const fullName = (u) =>
  u ? `${u.firstName} ${u.lastName || ""}`.trim() : "An employee";

const payslipDiskPath = (url) =>
  url ? path.join(__dirname, "..", "..", url.replace(/^\/+/, "")) : null;

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

  // Active Admin and HR users of the company, minus anyone in `skip`.
  async _adminHrIds(companyId, skip = []) {
    const users = await User.find({
      companyId,
      role: { $in: ["admin", "hr"] },
      status: "active",
    })
      .select("_id")
      .lean();
    const skipSet = new Set(skip.map(String));
    return users.map((u) => String(u._id)).filter((id) => !skipSet.has(id));
  }

  async _notifyReleased(payroll, actingUser, { notifyAdmins = true } = {}) {
    try {
      const emp = await Employee.findById(payroll.employeeId)
        .select("userId")
        .lean();
      if (!emp) return;

      const [employeeUser, currency] = await Promise.all([
        User.findById(emp.userId).select("firstName lastName").lean(),
        currencyRepository.findById(payroll.currencyId),
      ]);

      const name = fullName(employeeUser);
      const symbol = currency?.symbol || currency?.code || "";
      const netPay = `${symbol}${Number(payroll.netPay || 0).toLocaleString()}`;
      const period = payroll.period;

      // Attach the payslip only if the file really exists on disk.
      const attachments = [];
      const file = payslipDiskPath(payroll.payslipUrl);
      if (file && fs.existsSync(file)) {
        attachments.push({ filename: `payslip-${period}.pdf`, path: file });
      }

      await notify({
        userId: emp.userId,
        companyId: payroll.companyId,
        type: "payroll_released",
        title: `Payslip for ${period} is ready`,
        message: `Your payroll for ${period} has been released. Net pay: ${netPay}.`,
        link: "/payroll",
        entityType: "Payroll",
        entityId: payroll._id,
        email: {
          templateCode: "payroll_released",
          variables: { period, netPay },
          attachments,
        },
      });

      if (notifyAdmins) {
        const adminIds = await this._adminHrIds(payroll.companyId, [
          actingUser._id,
          emp.userId,
        ]);
        await notifyBulk(adminIds, {
          companyId: payroll.companyId,
          type: "payroll_released",
          title: "Payroll released",
          message: `${fullName(actingUser)} released ${name}'s payroll for ${period} (${netPay}).`,
          link: "/payroll",
          entityType: "Payroll",
          entityId: payroll._id,
        });
      }
    } catch (err) {
      console.error("[payroll] notify failed:", err.message);
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
    const [enriched] = await payrollRepository.enrich([doc]);
    return enriched;
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

    const updated = await payrollRepository.update(id, safeData);

    const existingDeduction =
      await payrollStatutoryDeductionRepository.findByPayrollId(id);
    if (existingDeduction) {
      return await payrollStatutoryDeductionRepository.syncPayrollTotals(id);
    }

    return updated;
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

  async release(id, file, actingUser, { notifyAdmins = true } = {}) {
    const doc = await payrollRepository.findById(id);
    if (!doc) throw new Error("Payroll not found");
    TenantScope.assertAccess(actingUser, doc, "Payroll not found");

    if (doc.status !== "approved") {
      throw new Error("Only an approved payroll record can be released");
    }

    const update = { status: "released" };

    if (file) {
      // Manual override still supported, e.g. a company that wants to attach
      // its own pre-formatted payslip instead of the generated one.
      update.payslipUrl = `/uploads/payslips/${file.filename}`;
    } else {
      update.payslipUrl = await payslipService.generateAndStore(id);
    }

    const released = await payrollRepository.update(id, update);

    await this._notifyReleased(released, actingUser, { notifyAdmins });

    return released;
  }

  async bulkRelease(ids, actingUser) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("ids must be a non-empty array of payroll IDs");
    }

    const results = [];
    for (const id of ids) {
      try {
        // Each employee is notified individually; Admin/HR get one summary
        // below instead of one notification per employee.
        const doc = await this.release(id, null, actingUser, {
          notifyAdmins: false,
        });
        results.push({ id, success: true, payroll: doc });
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }

    const ok = results.filter((r) => r.success);

    if (ok.length > 0) {
      try {
        const first = ok[0].payroll;
        const adminIds = await this._adminHrIds(first.companyId, [
          actingUser._id,
        ]);
        await notifyBulk(adminIds, {
          companyId: first.companyId,
          type: "payroll_released",
          title: "Payroll released",
          message: `${fullName(actingUser)} released ${ok.length} payroll record(s) for ${first.period}.`,
          link: "/payroll",
        });
      } catch (err) {
        console.error("[payroll] bulk notify failed:", err.message);
      }
    }

    return {
      releasedCount: ok.length,
      failedCount: results.length - ok.length,
      results,
    };
  }
}

module.exports = new PayrollService();
