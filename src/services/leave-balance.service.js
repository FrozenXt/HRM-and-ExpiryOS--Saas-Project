// services/leave-balance.service.js
const leaveBalanceRepository = require("../repositories/leave-balance.repository");
const employeeRepository = require("../repositories/employee.repository");

class LeaveBalanceService {
  // Returns null for admin/hr (no restriction), or a company-scoped employeeId list for staff.
  async _employeeScope(user) {
    if (user.role !== "staff") return null;

    const employee = await employeeRepository.findByUserId(user._id);
    if (!employee) {
      const err = new Error("No employee profile linked to this user");
      err.statusCode = 404;
      throw err;
    }
    return [employee._id];
  }

  async getAll(searchHelper, user) {
    const scope = await this._employeeScope(user);
    return await leaveBalanceRepository.findAll(searchHelper, scope);
  }

  async getById(id, user) {
    const scope = await this._employeeScope(user);
    const record = await leaveBalanceRepository.findById(id, scope);
    if (!record) {
      const err = new Error("Leave balance not found");
      err.statusCode = 404;
      throw err;
    }
    return record;
  }

  async create(data, user) {
    return await leaveBalanceRepository.create(data);
  }

  async update(id, data, user) {
    const record = await leaveBalanceRepository.update(id, null, data);
    if (!record) {
      const err = new Error("Leave balance not found");
      err.statusCode = 404;
      throw err;
    }
    return record;
  }

  async remove(id, user) {
    const record = await leaveBalanceRepository.delete(id, null);
    if (!record) {
      const err = new Error("Leave balance not found");
      err.statusCode = 404;
      throw err;
    }
    return record;
  }
}

module.exports = new LeaveBalanceService();
