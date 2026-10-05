const advanceSalaryRepository = require("../repositories/advance-salary.repository");
const employeeRepository = require("../repositories/employee.repository");
const salaryStructureRepository = require("../repositories/salary-structure.repository");
const userRepository = require("../repositories/user.repository");
const TenantScope = require("../helpers/tenant-scope.helper");
const { notify, notifyBulk, adminHrIds } = require("./notification.service");

// An advance can be at most this % of the employee's basic salary.
const MAX_ADVANCE_PERCENT = 50;
const MAX_INSTALLMENTS = 12;

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const fullName = (u) =>
  u ? `${u.firstName} ${u.lastName || ""}`.trim() : "An employee";

const fail = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

const idOf = (v) => v?._id || v;

const periodOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const nextMonthPeriod = () => {
  const d = new Date();
  return periodOf(new Date(d.getFullYear(), d.getMonth() + 1, 1));
};

class AdvanceSalaryService {
  async _getActingEmployeeId(actingUser) {
    if (actingUser.role !== "staff") return null;
    const employee = await employeeRepository.findByUserId(actingUser._id);
    if (!employee) fail("No employee profile found for this account", 404);
    return employee._id;
  }

  /* ---------- notifications (never throw) ---------- */

  // Admin/HR: in-app.
  async _notifySubmitted(doc, employee, actingUser) {
    try {
      const employeeUser = await userRepository.findById(employee.userId);
      const adminIds = await adminHrIds(doc.companyId, [
        actingUser._id,
        employee.userId,
      ]);
      await notifyBulk(adminIds, {
        companyId: doc.companyId,
        type: "advance_salary_submitted",
        title: "Advance salary request",
        message: `${fullName(employeeUser)} requested an advance of ${doc.amount} over ${doc.installments} month(s).`,
        link: "/advance-salary",
        entityType: "AdvanceSalary",
        entityId: doc._id,
      });
    } catch (err) {
      console.error("[advance-salary] notify failed:", err.message);
    }
  }

  // Employee: in-app + email. Other Admin/HR: in-app.
  async _notifyReviewed(doc, employee, actingUser) {
    try {
      const employeeUser = await userRepository.findById(employee.userId);
      const approved = doc.status === "approved";
      const remarks = doc.remarks ? ` Remarks: ${doc.remarks}` : "";

      await notify({
        userId: employee.userId,
        companyId: doc.companyId,
        type: "advance_salary_reviewed",
        title: `Advance salary ${doc.status}`,
        message: approved
          ? `Your advance of ${doc.amount} was approved. Recovery starts with the ${doc.startPeriod} payroll in ${doc.installments} installment(s) of ${doc.installmentAmount}.${remarks}`
          : `Your advance request of ${doc.amount} was rejected.${remarks}`,
        link: "/advance-salary",
        entityType: "AdvanceSalary",
        entityId: doc._id,
        email: { templateCode: "generic" },
      });

      const adminIds = await adminHrIds(doc.companyId, [
        actingUser._id,
        employee.userId,
      ]);
      await notifyBulk(adminIds, {
        companyId: doc.companyId,
        type: "advance_salary_reviewed",
        title: `Advance salary ${doc.status}`,
        message: `${fullName(actingUser)} ${doc.status} ${fullName(employeeUser)}'s advance of ${doc.amount}.`,
        link: "/advance-salary",
        entityType: "AdvanceSalary",
        entityId: doc._id,
      });
    } catch (err) {
      console.error("[advance-salary] notify failed:", err.message);
    }
  }

  async _notifyClosed(doc) {
    try {
      const employee = await employeeRepository.findById(idOf(doc.employeeId));
      if (!employee) return;
      await notify({
        userId: employee.userId,
        companyId: doc.companyId,
        type: "advance_salary_closed",
        title: "Advance fully recovered",
        message: `Your advance of ${doc.amount} has been fully recovered. No further deductions.`,
        link: "/advance-salary",
        entityType: "AdvanceSalary",
        entityId: doc._id,
      });
    } catch (err) {
      console.error("[advance-salary] notify failed:", err.message);
    }
  }

  /* ---------- reads ---------- */

  async getAll(searchHelper, actingUser) {
    const employeeId = await this._getActingEmployeeId(actingUser);
    const scopeFilters = TenantScope.scopeToOwnEmployee(
      actingUser,
      {},
      employeeId,
    );
    return await advanceSalaryRepository.findAll(searchHelper, scopeFilters);
  }

  async getById(id, actingUser) {
    const doc = await advanceSalaryRepository.findById(id);
    if (!doc) fail("Advance salary request not found", 404);
    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Advance salary request not found",
    );
    return doc;
  }

  /* ---------- writes ---------- */

  // Staff request their own. Admin/HR/Super Admin can file on behalf of an employee.
  async create(data, actingUser) {
    let employee;
    if (actingUser.role === "staff") {
      employee = await employeeRepository.findByUserId(actingUser._id);
      if (!employee) fail("No employee profile found for this account", 404);
    } else {
      if (!data.employeeId) fail("employeeId is required");
      employee = await employeeRepository.findById(data.employeeId);
    }
    if (!employee) fail("Employee not found", 404);

    const companyId = TenantScope.resolveCompanyId(
      actingUser,
      employee.companyId,
    );
    if (String(employee.companyId) !== String(companyId)) {
      fail("employeeId must belong to the same company");
    }
    if (employee.status !== "active") fail("This employee is not active");

    const amount = Number(data.amount);
    const installments = Number(data.installments);
    if (!Number.isInteger(amount) || amount <= 0) {
      fail("amount must be a positive whole number");
    }
    if (
      !Number.isInteger(installments) ||
      installments < 1 ||
      installments > MAX_INSTALLMENTS
    ) {
      fail(`installments must be a whole number from 1 to ${MAX_INSTALLMENTS}`);
    }
    if (!data.reason?.trim()) fail("reason is required");

    const structure = await salaryStructureRepository.findByEmployeeId(
      employee._id,
    );
    if (!structure) {
      fail(
        "This employee has no salary structure, so an advance cannot be set up",
      );
    }

    const cap = Math.floor((structure.basic * MAX_ADVANCE_PERCENT) / 100);
    if (amount > cap) {
      fail(
        `An advance cannot exceed ${MAX_ADVANCE_PERCENT}% of basic salary (maximum ${cap})`,
      );
    }

    const open = await advanceSalaryRepository.findOpenByEmployeeId(
      employee._id,
    );
    if (open) {
      fail("This employee already has a pending or unrecovered advance");
    }

    const created = await advanceSalaryRepository.create({
      employeeId: employee._id,
      companyId,
      currencyId: structure.currencyId,
      amount,
      reason: data.reason.trim(),
      installments,
      installmentAmount: Math.floor(amount / installments),
      status: "pending",
    });

    await this._notifySubmitted(created, employee, actingUser);

    return created;
  }

  // Admin/HR/Super Admin only — enforced at the route layer.
  async review(id, { status, startPeriod, remarks }, actingUser) {
    if (!["approved", "rejected"].includes(status)) {
      fail('status must be either "approved" or "rejected"');
    }

    const doc = await advanceSalaryRepository.findById(id);
    if (!doc) fail("Advance salary request not found", 404);
    TenantScope.assertAccess(
      actingUser,
      doc,
      "Advance salary request not found",
    );

    if (doc.status !== "pending") {
      fail("Only a pending request can be reviewed");
    }
    if (status === "rejected" && !remarks?.trim()) {
      fail("remarks are required when rejecting a request");
    }

    const employee = await employeeRepository.findById(idOf(doc.employeeId));
    if (!employee) fail("Employee not found", 404);

    if (String(employee.userId) === String(actingUser._id)) {
      fail("You cannot review your own advance request", 403);
    }

    let firstPeriod = null;
    if (status === "approved") {
      firstPeriod = startPeriod || nextMonthPeriod();
      if (!PERIOD_RE.test(firstPeriod)) {
        fail("startPeriod must be in YYYY-MM format");
      }
      if (firstPeriod < periodOf(new Date())) {
        fail("startPeriod cannot be before the current month");
      }
    }

    const updated = await advanceSalaryRepository.update(id, {
      status,
      startPeriod: firstPeriod,
      approvedBy: actingUser._id,
      approvedAt: new Date(),
      remarks: remarks?.trim() || null,
    });

    await this._notifyReviewed(updated || doc, employee, actingUser);

    return updated;
  }

  // Employee can cancel their own pending request. Admin/HR can also cancel an
  // approved one, as long as nothing has been recovered yet.
  async cancel(id, actingUser) {
    const doc = await advanceSalaryRepository.findById(id);
    if (!doc) fail("Advance salary request not found", 404);
    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Advance salary request not found",
    );

    const isStaff = actingUser.role === "staff";
    const cancellable =
      doc.status === "pending" ||
      (!isStaff &&
        doc.status === "approved" &&
        (doc.repayments || []).length === 0);
    if (!cancellable) {
      fail("This request can no longer be cancelled");
    }

    return await advanceSalaryRepository.update(id, { status: "cancelled" });
  }

  async remove(id, actingUser) {
    const doc = await advanceSalaryRepository.findById(id);
    if (!doc) fail("Advance salary request not found", 404);
    TenantScope.assertAccess(
      actingUser,
      doc,
      "Advance salary request not found",
    );

    if (["approved", "closed"].includes(doc.status)) {
      fail("An approved or closed advance cannot be deleted");
    }

    await advanceSalaryRepository.delete(id);
    return doc;
  }

  /* ---------- payroll hooks ---------- */

  // What to deduct from this employee's payroll for `period` (YYYY-MM).
  // Returns { advanceId, amount } or null when nothing is due.
  async getDeductionForPeriod(employeeId, period) {
    const advance =
      await advanceSalaryRepository.findActiveByEmployeeId(employeeId);
    if (!advance || !advance.startPeriod || period < advance.startPeriod) {
      return null;
    }

    // Already recovered for this period: return the same figure so a
    // recalculated draft doesn't change.
    const recorded = (advance.repayments || []).find(
      (r) => r.period === period,
    );
    if (recorded) return { advanceId: advance._id, amount: recorded.amount };

    const remaining = advance.amount - advance.recoveredAmount;
    const installmentsLeft = advance.installments - advance.repayments.length;
    const amount =
      installmentsLeft <= 1
        ? remaining
        : Math.min(advance.installmentAmount, remaining);

    return amount > 0 ? { advanceId: advance._id, amount } : null;
  }

  // Call when the payroll is RELEASED (not while it's a draft), so deleted
  // drafts never count as recovered. Safe to call twice for the same period.
  async recordRecovery(advanceId, period, amount, payrollId = null) {
    const advance = await advanceSalaryRepository.findById(advanceId);
    if (!advance) return null;
    if ((advance.repayments || []).some((r) => r.period === period)) {
      return advance;
    }

    const recoveredAmount = advance.recoveredAmount + amount;
    const fullyRecovered = recoveredAmount >= advance.amount;

    const updated = await advanceSalaryRepository.update(advanceId, {
      repayments: [
        ...(advance.repayments || []),
        { period, amount, payrollId, recordedAt: new Date() },
      ],
      recoveredAmount,
      ...(fullyRecovered ? { status: "closed", closedAt: new Date() } : {}),
    });

    if (fullyRecovered) await this._notifyClosed(updated || advance);

    return updated;
  }
}

module.exports = new AdvanceSalaryService();
