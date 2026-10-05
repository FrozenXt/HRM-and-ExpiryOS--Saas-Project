// services/leave-request.service.js
const leaveRequestRepository = require("../repositories/leave-request.repository");
const leaveBalanceRepository = require("../repositories/leave-balance.repository");
const employeeRepository = require("../repositories/employee.repository");
const { notify } = require("./notification.service");
const Employee = require("../models/employee.model");
const User = require("../models/user.model");
const LeaveType = require("../models/leave-type.model");
const {
  countDays,
  ensureBalances,
  pendingDaysMap,
} = require("../helpers/leave-balance.helper");
const LeaveBalance = require("../models/leave-balance.model");

const fail = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
};

// Works whether a field is an id or a populated object.
const idOf = (v) => (v && v._id ? v._id : v);

const day = (d) => new Date(d).toISOString().slice(0, 10);
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");

class LeaveRequestService {
  async _scopeFor(user) {
    const scope = { companyId: user.companyId };
    if (user.role === "staff") {
      const employee = await employeeRepository.findByUserId(user._id);
      if (!employee) fail("No employee profile linked to this user", 404);
      scope.employeeId = employee._id;
    }
    return scope;
  }

  // Throws unless the employee has enough available days for this leave.
  // Available = remaining - days in other pending requests.
  // `excludeRequest` is the request being edited, so it isn't counted twice.
  async _assertBalance({
    companyId,
    employeeId,
    leaveTypeId,
    fromDate,
    toDate,
    excludeRequest = null,
  }) {
    const year = new Date(fromDate).getFullYear();
    const days = countDays(fromDate, toDate);

    await ensureBalances({ companyId, employeeIds: [employeeId], year });

    const balance = await LeaveBalance.findOne({
      employeeId,
      leaveTypeId,
      year,
    }).lean();

    if (!balance) fail("This leave type is not available for your company");

    const pending = await pendingDaysMap([employeeId]);
    let pendingDays = pending.get(`${employeeId}:${leaveTypeId}:${year}`) || 0;

    if (excludeRequest && excludeRequest.status === "pending") {
      const sameEmployee =
        String(idOf(excludeRequest.employeeId)) === String(employeeId);
      const sameType =
        String(idOf(excludeRequest.leaveTypeId)) === String(leaveTypeId);
      const sameYear = new Date(excludeRequest.fromDate).getFullYear() === year;
      if (sameEmployee && sameType && sameYear) {
        pendingDays -= countDays(
          excludeRequest.fromDate,
          excludeRequest.toDate,
        );
      }
    }

    const available = balance.remaining - pendingDays;
    if (available < days) {
      fail(
        `Not enough leave balance. Available: ${available} day(s), requested: ${days}`,
      );
    }
  }

  // Tells the reporting manager and the company's Admin/HR about a new
  // request. Never throws, so a notification problem can't make the
  // request itself fail.
  async _notifyNewRequest(created, companyId, actingUser) {
    try {
      const emp = await Employee.findById(created.employeeId)
        .select("userId reportingManagerId")
        .lean();
      if (!emp) return;

      const [requester, leaveType, admins, manager] = await Promise.all([
        User.findById(emp.userId).select("firstName lastName").lean(),
        LeaveType.findById(created.leaveTypeId).select("name").lean(),
        User.find({
          companyId,
          role: { $in: ["admin", "hr"] },
          status: "active",
        })
          .select("_id")
          .lean(),
        emp.reportingManagerId
          ? Employee.findById(emp.reportingManagerId).select("userId").lean()
          : null,
      ]);

      // Not the person asking for the leave, and not whoever submitted it.
      const skip = new Set([String(emp.userId), String(actingUser._id)]);
      const recipients = [
        ...admins.map((a) => String(a._id)),
        ...(manager?.userId ? [String(manager.userId)] : []),
      ].filter((id) => !skip.has(id));

      const name = fullName(requester) || "An employee";
      const type = leaveType?.name || "leave";
      const from = day(created.fromDate);
      const to = day(created.toDate);

      await Promise.all(
        [...new Set(recipients)].map((userId) =>
          notify({
            userId,
            companyId,
            type: "leave_requested",
            title: "New leave request",
            message: `${name} requested ${type} from ${from} to ${to}.`,
            link: "/leave-requests",
            entityType: "LeaveRequest",
            entityId: created._id,
            email: { templateCode: "generic" },
          }),
        ),
      );
    } catch (err) {
      console.error("[leave] notify failed:", err.message);
    }
  }

  async getAll(searchHelper, user) {
    const scope = await this._scopeFor(user);
    return await leaveRequestRepository.findAll(searchHelper, scope);
  }

  async getById(id, user) {
    const scope = await this._scopeFor(user);
    const record = await leaveRequestRepository.findById(id, scope);
    if (!record) fail("Leave request not found", 404);
    return record;
  }

  async create(data, user) {
    let employeeId = data.employeeId;
    let companyId = user.companyId;

    if (user.role === "staff") {
      const employee = await employeeRepository.findByUserId(user._id);
      if (!employee) fail("No employee profile linked to this user", 404);
      employeeId = employee._id;
    } else {
      if (!employeeId) fail("employeeId is required");
      const employee = await employeeRepository.findById(employeeId);
      if (!employee) fail("employeeId does not refer to an existing employee");
      if (
        user.role !== "super_admin" &&
        String(employee.companyId) !== String(user.companyId)
      ) {
        fail("employeeId must belong to your own company");
      }
      // Super admins have no company of their own; use the employee's.
      companyId = employee.companyId;
    }

    if (new Date(data.fromDate) > new Date(data.toDate)) {
      fail("fromDate cannot be after toDate");
    }

    await this._assertBalance({
      companyId,
      employeeId,
      leaveTypeId: data.leaveTypeId,
      fromDate: data.fromDate,
      toDate: data.toDate,
    });

    const created = await leaveRequestRepository.create({
      ...data,
      employeeId,
      companyId,
      status: "pending",
      approvedBy: null,
    });

    await this._notifyNewRequest(created, companyId, user);

    return created;
  }

  async update(id, data, user) {
    const scope = await this._scopeFor(user);
    const existing = await leaveRequestRepository.findById(id, scope);
    if (!existing) fail("Leave request not found", 404);

    // Staff may only edit their own request while it's still pending.
    if (user.role === "staff" && existing.status !== "pending") {
      fail("Only pending leave requests can be edited");
    }

    // Status, approver, owner and company can't be changed through an edit.
    const { status, approvedBy, employeeId, companyId, ...editable } = data;

    const fromDate = editable.fromDate ?? existing.fromDate;
    const toDate = editable.toDate ?? existing.toDate;
    const leaveTypeId = editable.leaveTypeId ?? idOf(existing.leaveTypeId);

    if (new Date(fromDate) > new Date(toDate)) {
      fail("fromDate cannot be after toDate");
    }

    // Dates or leave type changed on a pending request: check the balance again.
    const changed =
      editable.fromDate !== undefined ||
      editable.toDate !== undefined ||
      editable.leaveTypeId !== undefined;

    if (changed && existing.status === "pending") {
      await this._assertBalance({
        companyId: idOf(existing.companyId) || user.companyId,
        employeeId: idOf(existing.employeeId),
        leaveTypeId,
        fromDate,
        toDate,
        excludeRequest: existing,
      });
    }

    return await leaveRequestRepository.update(id, scope, editable);
  }

  async remove(id, user) {
    const scope = await this._scopeFor(user);
    const existing = await leaveRequestRepository.findById(id, scope);
    if (!existing) fail("Leave request not found", 404);

    if (user.role === "staff" && existing.status !== "pending") {
      fail("Only pending leave requests can be cancelled");
    }

    // Deleting an approved leave gives its days back to the balance.
    if (existing.status === "approved") {
      await leaveBalanceRepository.incrementUsed(
        idOf(existing.employeeId),
        idOf(existing.leaveTypeId),
        -countDays(existing.fromDate, existing.toDate),
        new Date(existing.fromDate).getFullYear(),
      );
    }

    return await leaveRequestRepository.delete(id, scope);
  }

  async setStatus(id, approved, user) {
    const scope = { companyId: user.companyId };
    const record = await leaveRequestRepository.findById(id, scope);
    if (!record) fail("Leave request not found", 404);
    if (record.status !== "pending") {
      fail("Leave request has already been decided");
    }

    const employeeId = idOf(record.employeeId);
    const leaveTypeId = idOf(record.leaveTypeId);
    const year = new Date(record.fromDate).getFullYear();
    const days = countDays(record.fromDate, record.toDate);

    // Check the balance BEFORE approving, so a request is never approved
    // when it would push the balance below zero.
    if (approved) {
      await ensureBalances({
        companyId: user.companyId,
        employeeIds: [employeeId],
        year,
      });
      const balance = await LeaveBalance.findOne({
        employeeId,
        leaveTypeId,
        year,
      }).lean();
      if (!balance) fail("No leave balance found for this leave type");
      if (balance.remaining < days) {
        fail(
          `Cannot approve: only ${balance.remaining} day(s) remaining, requested ${days}`,
        );
      }
    }

    const updated = await leaveRequestRepository.update(id, scope, {
      status: approved ? "approved" : "rejected",
      approvedBy: user._id,
    });

    if (approved) {
      await leaveBalanceRepository.incrementUsed(
        employeeId,
        leaveTypeId,
        days,
        year,
      );
    }

    // Tell the employee about the decision (never throws).
    const emp = await Employee.findById(employeeId).select("userId").lean();
    if (emp) {
      const status = approved ? "approved" : "rejected";
      await notify({
        userId: emp.userId,
        companyId: user.companyId,
        type: approved ? "leave_approved" : "leave_rejected",
        title: `Leave ${status}`,
        message: `Your ${record.leaveTypeName || "leave"} request (${day(record.fromDate)} to ${day(record.toDate)}) was ${status}.`,
        link: "/leave-requests",
        entityType: "LeaveRequest",
        entityId: id,
        email: {
          templateCode: "leave_decided",
          variables: {
            status,
            leaveType: record.leaveTypeName || "leave",
            fromDate: day(record.fromDate),
            toDate: day(record.toDate),
            decidedBy: fullName(user),
          },
        },
      });
    }

    return updated;
  }
}

module.exports = new LeaveRequestService();
