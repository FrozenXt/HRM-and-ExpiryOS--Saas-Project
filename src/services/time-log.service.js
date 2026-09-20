const timeLogRepository = require("../repositories/time-log.repository");
const employeeRepository = require("../repositories/employee.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

class TimeLogService {
  async _getActingEmployeeId(actingUser) {
    if (actingUser.role !== "staff") return null;
    const employee = await employeeRepository.findByUserId(actingUser._id);
    if (!employee)
      throw new Error("No employee profile found for this account");
    return employee._id;
  }

  async getAll(searchHelper, actingUser) {
    const employeeId = await this._getActingEmployeeId(actingUser);
    const scopeFilters = TenantScope.scopeToOwnEmployee(
      actingUser,
      {},
      employeeId,
    );
    return await timeLogRepository.findAll(searchHelper, scopeFilters);
  }

  async getById(id, actingUser) {
    const log = await timeLogRepository.findById(id);
    if (!log) throw new Error("Time log not found");
    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      log,
      employeeId,
      "Time log not found",
    );
    return log;
  }

  async create(data, actingUser) {
    let employeeId = data.employeeId;

    if (actingUser.role === "staff") {
      employeeId = await this._getActingEmployeeId(actingUser);
    } else if (!employeeId) {
      throw new Error("employeeId is required");
    }

    const employee = await employeeRepository.findById(employeeId);
    if (!employee)
      throw new Error("employeeId does not refer to an existing employee");

    if (
      actingUser.role !== "super_admin" &&
      employee.companyId.toString() !== actingUser.companyId.toString()
    ) {
      throw new Error("employeeId must belong to your own company");
    }

    return await timeLogRepository.create({
      employeeId,
      companyId: employee.companyId,
      date: data.date,
      hoursWorked: data.hoursWorked,
      overtimeHours: data.overtimeHours ?? null,
      taskDescription: data.taskDescription ?? null,
      status: "draft",
    });
  }

  async update(id, data, actingUser) {
    const log = await timeLogRepository.findById(id);
    if (!log) throw new Error("Time log not found");

    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      log,
      employeeId,
      "Time log not found",
    );

    if (log.status !== "draft") {
      throw new Error("Only a draft time log can be edited");
    }

    const {
      employeeId: _e,
      companyId: _c,
      status,
      approvedBy,
      ...safeData
    } = data;
    return await timeLogRepository.update(id, safeData);
  }

  async remove(id, actingUser) {
    const log = await timeLogRepository.findById(id);
    if (!log) throw new Error("Time log not found");

    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      log,
      employeeId,
      "Time log not found",
    );

    if (log.status !== "draft") {
      throw new Error("Only a draft time log can be deleted");
    }

    await timeLogRepository.delete(id);
    return log;
  }

  async submit(id, actingUser) {
    const log = await timeLogRepository.findById(id);
    if (!log) throw new Error("Time log not found");

    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      log,
      employeeId,
      "Time log not found",
    );

    if (log.status !== "draft") {
      throw new Error("Only a draft time log can be submitted");
    }

    return await timeLogRepository.update(id, { status: "submitted" });
  }

  // Admin/HR/Super Admin only — enforced at the route layer.
  async review(id, { status }, actingUser) {
    if (!["approved", "rejected"].includes(status)) {
      throw new Error('status must be either "approved" or "rejected"');
    }

    const log = await timeLogRepository.findById(id);
    if (!log) throw new Error("Time log not found");

    TenantScope.assertAccess(actingUser, log, "Time log not found");

    if (log.status !== "submitted") {
      throw new Error("Only a submitted time log can be reviewed");
    }

    return await timeLogRepository.update(id, {
      status,
      approvedBy: actingUser._id,
    });
  }
}

module.exports = new TimeLogService();
