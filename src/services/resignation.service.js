const resignationRepository = require("../repositories/resignation.repository");
const employeeRepository = require("../repositories/employee.repository");
const userRepository = require("../repositories/user.repository");
const TenantScope = require("../helpers/tenant-scope.helper");
const { notify, notifyBulk, adminHrIds } = require("./notification.service");

// When the employee's login is switched off:
//   "approval"          -> the moment Admin/HR approve the resignation
//   "last_working_day"  -> when the daily job completes the resignation
const DEACTIVATE_LOGIN_ON = "approval";

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

function parseFutureDate(value, label) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) fail(`${label} is not a valid date`);
  if (d < startOfToday()) fail(`${label} cannot be in the past`);
  return d;
}

const idOf = (v) => v?._id || v;

class ResignationService {
  async _getActingEmployeeId(actingUser) {
    if (actingUser.role !== "staff") return null;
    const employee = await employeeRepository.findByUserId(actingUser._id);
    if (!employee) fail("No employee profile found for this account", 404);
    return employee._id;
  }

  async _deactivateLogin(userId) {
    // NOTE: assumes the User model uses status: "active" | "inactive".
    await userRepository.update(userId, { status: "inactive" });
  }

  /* ---------- notifications (never throw) ---------- */

  // Admin/HR: in-app. Employee: confirmation when someone filed it for them.
  async _notifySubmitted(doc, employee, actingUser) {
    try {
      const companyId = doc.companyId;
      const employeeUser = await userRepository.findById(employee.userId);
      const name = fullName(employeeUser);
      const lwd = day(doc.proposedLastWorkingDay);

      const adminIds = await adminHrIds(companyId, [
        actingUser._id,
        employee.userId,
      ]);
      await notifyBulk(adminIds, {
        companyId,
        type: "resignation_submitted",
        title: "Resignation submitted",
        message: `${name} submitted a resignation. Proposed last working day: ${lwd}.`,
        link: "/resignations",
        entityType: "Resignation",
        entityId: doc._id,
      });

      if (String(employee.userId) !== String(actingUser._id)) {
        await notify({
          userId: employee.userId,
          companyId,
          type: "resignation_submitted",
          title: "Resignation recorded",
          message: `${fullName(actingUser)} recorded a resignation for you. Proposed last working day: ${lwd}.`,
          link: "/resignations",
          entityType: "Resignation",
          entityId: doc._id,
        });
      }
    } catch (err) {
      console.error("[resignation] notify failed:", err.message);
    }
  }

  // Employee: in-app + email. Other Admin/HR: in-app.
  async _notifyReviewed(doc, employee, actingUser) {
    try {
      const companyId = doc.companyId;
      const employeeUser = await userRepository.findById(employee.userId);
      const name = fullName(employeeUser);
      const approved = doc.status === "approved";
      const lwd = doc.lastWorkingDay ? day(doc.lastWorkingDay) : null;
      const remarks = doc.remarks ? ` Remarks: ${doc.remarks}` : "";

      await notify({
        userId: employee.userId,
        companyId,
        type: "resignation_reviewed",
        title: `Resignation ${doc.status}`,
        message: approved
          ? `Your resignation was approved. Your last working day is ${lwd}.${remarks}`
          : `Your resignation was rejected.${remarks}`,
        link: "/resignations",
        entityType: "Resignation",
        entityId: doc._id,
        email: { templateCode: "generic" },
      });

      const adminIds = await adminHrIds(companyId, [
        actingUser._id,
        employee.userId,
      ]);
      await notifyBulk(adminIds, {
        companyId,
        type: "resignation_reviewed",
        title: `Resignation ${doc.status}`,
        message: `${fullName(actingUser)} ${doc.status} ${name}'s resignation${approved ? ` (last working day ${lwd})` : ""}.`,
        link: "/resignations",
        entityType: "Resignation",
        entityId: doc._id,
      });
    } catch (err) {
      console.error("[resignation] notify failed:", err.message);
    }
  }

  async _notifyWithdrawn(doc, employee, actingUser) {
    try {
      const employeeUser = await userRepository.findById(employee.userId);
      const adminIds = await adminHrIds(doc.companyId, [actingUser._id]);
      await notifyBulk(adminIds, {
        companyId: doc.companyId,
        type: "resignation_withdrawn",
        title: "Resignation withdrawn",
        message: `${fullName(employeeUser)} withdrew their resignation.`,
        link: "/resignations",
        entityType: "Resignation",
        entityId: doc._id,
      });
    } catch (err) {
      console.error("[resignation] notify failed:", err.message);
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
    return await resignationRepository.findAll(searchHelper, scopeFilters);
  }

  async getById(id, actingUser) {
    const doc = await resignationRepository.findById(id);
    if (!doc) fail("Resignation not found", 404);
    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Resignation not found",
    );
    return doc;
  }

  /* ---------- writes ---------- */

  // Staff file their own. Admin/HR/Super Admin can file on behalf of an employee.
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

    if (!data.reason?.trim()) fail("reason is required");
    const proposedLastWorkingDay = parseFutureDate(
      data.proposedLastWorkingDay,
      "proposedLastWorkingDay",
    );

    const open = await resignationRepository.findOpenByEmployeeId(employee._id);
    if (open) fail("This employee already has an open resignation");

    const created = await resignationRepository.create({
      employeeId: employee._id,
      companyId,
      reason: data.reason.trim(),
      proposedLastWorkingDay,
      status: "pending",
    });

    await this._notifySubmitted(created, employee, actingUser);

    return created;
  }

  // Admin/HR/Super Admin only — enforced at the route layer.
  async review(id, { status, lastWorkingDay, remarks }, actingUser) {
    if (!["approved", "rejected"].includes(status)) {
      fail('status must be either "approved" or "rejected"');
    }

    const doc = await resignationRepository.findById(id);
    if (!doc) fail("Resignation not found", 404);
    TenantScope.assertAccess(actingUser, doc, "Resignation not found");

    if (doc.status !== "pending") {
      fail("Only a pending resignation can be reviewed");
    }
    if (status === "rejected" && !remarks?.trim()) {
      fail("remarks are required when rejecting a resignation");
    }

    const employee = await employeeRepository.findById(idOf(doc.employeeId));
    if (!employee) fail("Employee not found", 404);

    if (String(employee.userId) === String(actingUser._id)) {
      fail("You cannot review your own resignation", 403);
    }

    const finalLwd =
      status === "approved"
        ? parseFutureDate(
            lastWorkingDay || doc.proposedLastWorkingDay,
            "lastWorkingDay",
          )
        : null;

    const updated = await resignationRepository.update(id, {
      status,
      lastWorkingDay: finalLwd,
      reviewedBy: actingUser._id,
      reviewedAt: new Date(),
      remarks: remarks?.trim() || null,
    });

    if (status === "approved" && DEACTIVATE_LOGIN_ON === "approval") {
      await this._deactivateLogin(employee.userId);
    }

    await this._notifyReviewed(updated || doc, employee, actingUser);

    return updated;
  }

  // The employee (or Admin/HR on their behalf) can pull back a pending one.
  async withdraw(id, actingUser) {
    const doc = await resignationRepository.findById(id);
    if (!doc) fail("Resignation not found", 404);
    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      doc,
      employeeId,
      "Resignation not found",
    );

    if (doc.status !== "pending") {
      fail("Only a pending resignation can be withdrawn");
    }

    const updated = await resignationRepository.update(id, {
      status: "withdrawn",
    });

    const employee = await employeeRepository.findById(idOf(doc.employeeId));
    if (employee) await this._notifyWithdrawn(doc, employee, actingUser);

    return updated;
  }

  async remove(id, actingUser) {
    const doc = await resignationRepository.findById(id);
    if (!doc) fail("Resignation not found", 404);
    TenantScope.assertAccess(actingUser, doc, "Resignation not found");

    if (["approved", "completed"].includes(doc.status)) {
      fail("An approved or completed resignation cannot be deleted");
    }

    await resignationRepository.delete(id);
    return doc;
  }

  /* ---------- daily job ---------- */

  // Called by the cron job. For every approved resignation whose last
  // working day has passed: employee -> inactive, login off, resignation -> completed.
  async completeDue(now = new Date()) {
    const due = await resignationRepository.findDueForCompletion(now);

    for (const r of due) {
      try {
        const employee = await employeeRepository.findById(idOf(r.employeeId));
        if (employee) {
          await employeeRepository.update(employee._id, { status: "inactive" });
          await this._deactivateLogin(employee.userId); // safe to repeat
        }

        await resignationRepository.update(r._id, {
          status: "completed",
          completedAt: new Date(),
        });

        const employeeUser = employee
          ? await userRepository.findById(employee.userId)
          : null;
        const adminIds = await adminHrIds(r.companyId);
        await notifyBulk(adminIds, {
          companyId: r.companyId,
          type: "resignation_completed",
          title: "Employee exit completed",
          message: `${fullName(employeeUser)}'s last working day has passed. The profile is now inactive.`,
          link: "/resignations",
          entityType: "Resignation",
          entityId: r._id,
        });
      } catch (err) {
        console.error(
          `[resignation] completeDue failed for ${r._id}:`,
          err.message,
        );
      }
    }
  }
}

module.exports = new ResignationService();
