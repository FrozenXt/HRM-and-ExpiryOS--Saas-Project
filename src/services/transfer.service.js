const transferRepository = require("../repositories/transfer.repository");
const employeeRepository = require("../repositories/employee.repository");
const departmentRepository = require("../repositories/department.repository");
const designationRepository = require("../repositories/designation.repository");
const shiftRepository = require("../repositories/shift.repository");
const userRepository = require("../repositories/user.repository");
const TenantScope = require("../helpers/tenant-scope.helper");
const { notify, notifyBulk, adminHrIds } = require("./notification.service");

const fullName = (u) =>
  u ? `${u.firstName} ${u.lastName || ""}`.trim() : "An employee";

const day = (d) => new Date(d).toLocaleDateString("en-CA");

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const fail = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode });
};

const idOf = (v) => v?._id || v;

// transfer field  ->  employee field it changes
const TARGETS = [
  ["toDepartmentId", "departmentId", "departmentId"],
  ["toDesignationId", "designationId", "designationId"],
  ["toReportingManagerId", "reportingManagerId", "reportingManagerId"],
  ["toShiftId", "shiftId", "shiftId"],
];

class TransferService {
  async _assertBelongsToCompany(repository, id, companyId, label) {
    const doc = await repository.findById(id);
    if (!doc || String(doc.companyId) !== String(companyId)) {
      fail(`${label} must belong to the same company`);
    }
    return doc;
  }

  // Applies the transfer to the employee record and marks it applied.
  async _apply(transfer) {
    const changes = {};
    for (const [toField, employeeField] of TARGETS) {
      const value = idOf(transfer[toField]);
      if (value) changes[employeeField] = value;
    }

    const employee = await employeeRepository.findById(
      idOf(transfer.employeeId),
    );
    if (!employee) fail("Employee not found", 404);

    await employeeRepository.update(employee._id, changes);
    const applied = await transferRepository.update(transfer._id, {
      status: "applied",
      appliedAt: new Date(),
    });

    try {
      await notify({
        userId: employee.userId,
        companyId: transfer.companyId,
        type: "transfer_applied",
        title: "Transfer is now in effect",
        message: `Your transfer took effect on ${day(transfer.effectiveDate)}. Your profile has been updated.`,
        link: "/profile",
        entityType: "Transfer",
        entityId: transfer._id,
      });
    } catch (err) {
      console.error("[transfer] notify failed:", err.message);
    }

    return applied;
  }

  /* ---------- notifications (never throw) ---------- */

  // Admin/HR: in-app.
  async _notifyCreated(doc, employee, actingUser) {
    try {
      const employeeUser = await userRepository.findById(employee.userId);
      const adminIds = await adminHrIds(doc.companyId, [actingUser._id]);
      await notifyBulk(adminIds, {
        companyId: doc.companyId,
        type: "transfer_created",
        title: "Transfer awaiting approval",
        message: `${fullName(actingUser)} raised a transfer for ${fullName(employeeUser)}, effective ${day(doc.effectiveDate)}.`,
        link: "/transfers",
        entityType: "Transfer",
        entityId: doc._id,
      });
    } catch (err) {
      console.error("[transfer] notify failed:", err.message);
    }
  }

  // Employee: in-app + email (only when approved). Other Admin/HR: in-app.
  async _notifyReviewed(doc, employee, actingUser) {
    try {
      const employeeUser = await userRepository.findById(employee.userId);
      const approved = doc.status === "approved" || doc.status === "applied";
      const remarks = doc.remarks ? ` Remarks: ${doc.remarks}` : "";

      if (approved) {
        await notify({
          userId: employee.userId,
          companyId: doc.companyId,
          type: "transfer_reviewed",
          title: "Transfer approved",
          message: `Your transfer has been approved, effective ${day(doc.effectiveDate)}.${remarks}`,
          link: "/profile",
          entityType: "Transfer",
          entityId: doc._id,
          email: { templateCode: "generic" },
        });
      }

      const adminIds = await adminHrIds(doc.companyId, [
        actingUser._id,
        employee.userId,
      ]);
      await notifyBulk(adminIds, {
        companyId: doc.companyId,
        type: "transfer_reviewed",
        title: approved ? "Transfer approved" : "Transfer rejected",
        message: `${fullName(actingUser)} ${approved ? "approved" : "rejected"} the transfer of ${fullName(employeeUser)}.${remarks}`,
        link: "/transfers",
        entityType: "Transfer",
        entityId: doc._id,
      });
    } catch (err) {
      console.error("[transfer] notify failed:", err.message);
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
    return await transferRepository.findAll(searchHelper, scopeFilters);
  }

  async getById(id, actingUser) {
    const doc = await transferRepository.findById(id);
    if (!doc) fail("Transfer not found", 404);
    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Transfer not found",
    );
    return doc;
  }

  async _getActingEmployeeId(actingUser) {
    if (actingUser.role !== "staff") return null;
    const employee = await employeeRepository.findByUserId(actingUser._id);
    if (!employee) fail("No employee profile found for this account", 404);
    return employee._id;
  }

  /* ---------- writes ---------- */

  // Admin/HR/Super Admin only — enforced at the route layer.
  async create(data, actingUser) {
    const employee = await employeeRepository.findById(data.employeeId);
    if (!employee) fail("employeeId does not refer to an existing employee");

    const companyId = TenantScope.resolveCompanyId(
      actingUser,
      employee.companyId,
    );
    if (String(employee.companyId) !== String(companyId)) {
      fail("employeeId must belong to the same company");
    }
    if (employee.status !== "active") fail("This employee is not active");

    const effectiveDate = new Date(data.effectiveDate);
    if (!data.effectiveDate || Number.isNaN(effectiveDate.getTime())) {
      fail("effectiveDate is not a valid date");
    }
    if (effectiveDate < startOfToday()) {
      fail("effectiveDate cannot be in the past");
    }

    // Only keep targets that were sent and actually differ from today.
    const targets = {};
    for (const [toField, employeeField] of TARGETS) {
      const value = data[toField] || null;
      if (value && String(value) !== String(idOf(employee[employeeField]))) {
        targets[toField] = value;
      }
    }
    if (Object.keys(targets).length === 0) {
      fail("Nothing to change — set at least one new value");
    }

    if (targets.toDepartmentId) {
      await this._assertBelongsToCompany(
        departmentRepository,
        targets.toDepartmentId,
        companyId,
        "toDepartmentId",
      );
    }
    if (targets.toDesignationId) {
      await this._assertBelongsToCompany(
        designationRepository,
        targets.toDesignationId,
        companyId,
        "toDesignationId",
      );
    }
    if (targets.toShiftId) {
      await this._assertBelongsToCompany(
        shiftRepository,
        targets.toShiftId,
        companyId,
        "toShiftId",
      );
    }
    if (targets.toReportingManagerId) {
      if (String(targets.toReportingManagerId) === String(employee._id)) {
        fail("An employee cannot report to themselves");
      }
      await this._assertBelongsToCompany(
        employeeRepository,
        targets.toReportingManagerId,
        companyId,
        "toReportingManagerId",
      );
    }

    const open = await transferRepository.findOpenByEmployeeId(employee._id);
    if (open) fail("This employee already has an open transfer");

    const created = await transferRepository.create({
      employeeId: employee._id,
      companyId,
      fromDepartmentId: idOf(employee.departmentId),
      fromDesignationId: idOf(employee.designationId),
      fromReportingManagerId: idOf(employee.reportingManagerId) || null,
      fromShiftId: idOf(employee.shiftId) || null,
      ...targets,
      effectiveDate,
      reason: data.reason?.trim() || null,
      status: "pending",
      requestedBy: actingUser._id,
    });

    await this._notifyCreated(created, employee, actingUser);

    return created;
  }

  // Admin/HR/Super Admin only. Approving a transfer whose effective date has
  // already arrived applies it straight away; otherwise the daily job does.
  async review(id, { status, remarks }, actingUser) {
    if (!["approved", "rejected"].includes(status)) {
      fail('status must be either "approved" or "rejected"');
    }

    const doc = await transferRepository.findById(id);
    if (!doc) fail("Transfer not found", 404);
    TenantScope.assertAccess(actingUser, doc, "Transfer not found");

    if (doc.status !== "pending") {
      fail("Only a pending transfer can be reviewed");
    }
    if (status === "rejected" && !remarks?.trim()) {
      fail("remarks are required when rejecting a transfer");
    }

    const employee = await employeeRepository.findById(idOf(doc.employeeId));
    if (!employee) fail("Employee not found", 404);

    if (String(employee.userId) === String(actingUser._id)) {
      fail("You cannot review your own transfer", 403);
    }

    let updated = await transferRepository.update(id, {
      status,
      reviewedBy: actingUser._id,
      reviewedAt: new Date(),
      remarks: remarks?.trim() || null,
    });

    if (status === "approved" && new Date(doc.effectiveDate) <= new Date()) {
      updated = await this._apply(updated || doc);
    }

    await this._notifyReviewed(updated || doc, employee, actingUser);

    return updated;
  }

  // Pending or approved-but-not-yet-applied transfers can be cancelled.
  async cancel(id, actingUser) {
    const doc = await transferRepository.findById(id);
    if (!doc) fail("Transfer not found", 404);
    TenantScope.assertAccess(actingUser, doc, "Transfer not found");

    if (!["pending", "approved"].includes(doc.status)) {
      fail("Only a pending or approved transfer can be cancelled");
    }

    return await transferRepository.update(id, { status: "cancelled" });
  }

  async remove(id, actingUser) {
    const doc = await transferRepository.findById(id);
    if (!doc) fail("Transfer not found", 404);
    TenantScope.assertAccess(actingUser, doc, "Transfer not found");

    if (["approved", "applied"].includes(doc.status)) {
      fail("An approved or applied transfer cannot be deleted");
    }

    await transferRepository.delete(id);
    return doc;
  }

  /* ---------- daily job ---------- */

  // Called by the cron job: applies every approved transfer that is now due.
  async applyDue(now = new Date()) {
    const due = await transferRepository.findDueForApply(now);

    for (const t of due) {
      try {
        await this._apply(t);
      } catch (err) {
        console.error(`[transfer] applyDue failed for ${t._id}:`, err.message);
      }
    }
  }
}

module.exports = new TransferService();
