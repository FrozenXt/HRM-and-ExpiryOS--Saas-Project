// services/leave-request.service.js
const leaveRequestRepository = require("../repositories/leave-request.repository");
const leaveBalanceRepository = require("../repositories/leave-balance.repository");
const employeeRepository = require("../repositories/employee.repository");

class LeaveRequestService {
  async _scopeFor(user) {
    const scope = { companyId: user.companyId };
    if (user.role === "staff") {
      const employee = await employeeRepository.findByUserId(user._id);
      if (!employee) {
        const err = new Error("No employee profile linked to this user");
        err.statusCode = 404;
        throw err;
      }
      scope.employeeId = employee._id;
    }
    return scope;
  }

  async getAll(searchHelper, user) {
    const scope = await this._scopeFor(user);
    return await leaveRequestRepository.findAll(searchHelper, scope);
  }

  async getById(id, user) {
    const scope = await this._scopeFor(user);
    const record = await leaveRequestRepository.findById(id, scope);
    if (!record) {
      const err = new Error("Leave request not found");
      err.statusCode = 404;
      throw err;
    }
    return record;
  }

  async create(data, user) {
    let employeeId = data.employeeId;

    if (user.role === "staff") {
      const employee = await employeeRepository.findByUserId(user._id);
      if (!employee) {
        const err = new Error("No employee profile linked to this user");
        err.statusCode = 404;
        throw err;
      }
      employeeId = employee._id;
    }

    if (new Date(data.fromDate) > new Date(data.toDate)) {
      const err = new Error("fromDate cannot be after toDate");
      err.statusCode = 400;
      throw err;
    }

    return await leaveRequestRepository.create({
      ...data,
      employeeId,
      companyId: user.companyId,
      status: "pending",
      approvedBy: null,
    });
  }

  async update(id, data, user) {
    const scope = await this._scopeFor(user);
    const existing = await leaveRequestRepository.findById(id, scope);
    if (!existing) {
      const err = new Error("Leave request not found");
      err.statusCode = 404;
      throw err;
    }

    // Staff may only edit their own request while it's still pending.
    if (user.role === "staff" && existing.status !== "pending") {
      const err = new Error("Only pending leave requests can be edited");
      err.statusCode = 400;
      throw err;
    }

    const { status, approvedBy, ...editable } = data;
    return await leaveRequestRepository.update(id, scope, editable);
  }

  async remove(id, user) {
    const scope = await this._scopeFor(user);
    const existing = await leaveRequestRepository.findById(id, scope);
    if (!existing) {
      const err = new Error("Leave request not found");
      err.statusCode = 404;
      throw err;
    }

    if (user.role === "staff" && existing.status !== "pending") {
      const err = new Error("Only pending leave requests can be cancelled");
      err.statusCode = 400;
      throw err;
    }

    return await leaveRequestRepository.delete(id, scope);
  }

  async setStatus(id, approved, user) {
    const record = await leaveRequestRepository.findById(id, {
      companyId: user.companyId,
    });
    if (!record) {
      const err = new Error("Leave request not found");
      err.statusCode = 404;
      throw err;
    }
    if (record.status !== "pending") {
      const err = new Error("Leave request has already been decided");
      err.statusCode = 400;
      throw err;
    }

    const updated = await leaveRequestRepository.update(
      id,
      { companyId: user.companyId },
      {
        status: approved ? "approved" : "rejected",
        approvedBy: user._id,
      },
    );

    if (approved) {
      const days =
        Math.ceil((updated.toDate - updated.fromDate) / (1000 * 60 * 60 * 24)) +
        1;
      await leaveBalanceRepository.incrementUsed(
        updated.employeeId,
        updated.leaveTypeId,
        days,
      );
    }

    return updated;
  }
}

module.exports = new LeaveRequestService();
