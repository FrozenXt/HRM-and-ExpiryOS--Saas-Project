const regularizationRequestRepository = require("../repositories/regularization-request.repository");
const attendanceRepository = require("../repositories/attendance.repository");
const employeeRepository = require("../repositories/employee.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

class RegularizationRequestService {
  async _getActingEmployeeId(actingUser) {
    if (actingUser.role !== "staff") return null;
    const employee = await employeeRepository.findByUserId(actingUser._id);
    if (!employee)
      throw new Error("No employee profile found for this account");
    return employee._id;
  }

  async getRequests(searchHelper, actingUser) {
    const employeeId = await this._getActingEmployeeId(actingUser);
    const scopeFilters = TenantScope.scopeToOwnEmployee(
      actingUser,
      {},
      employeeId,
    );
    return await regularizationRequestRepository.findAll(
      searchHelper,
      scopeFilters,
    );
  }

  async getRequestById(id, actingUser) {
    const request = await regularizationRequestRepository.findById(id);
    if (!request) throw new Error("Regularization request not found");
    const employeeId = await this._getActingEmployeeId(actingUser);
    TenantScope.assertEmployeeAccess(
      actingUser,
      request,
      employeeId,
      "Regularization request not found",
    );
    return request;
  }

  async createRequest(data, actingUser) {
    const attendance = await attendanceRepository.findById(data.attendanceId);
    if (!attendance)
      throw new Error(
        "attendanceId does not refer to an existing attendance record",
      );

    if (actingUser.role === "staff") {
      const employeeId = await this._getActingEmployeeId(actingUser);
      if (attendance.employeeId.toString() !== employeeId.toString()) {
        throw new Error(
          "You can only request regularization for your own attendance",
        );
      }
    } else if (
      actingUser.role !== "super_admin" &&
      attendance.companyId.toString() !== actingUser.companyId.toString()
    ) {
      throw new Error("attendanceId must belong to your own company");
    }

    return await regularizationRequestRepository.create({
      attendanceId: attendance._id,
      employeeId: attendance.employeeId,
      companyId: attendance.companyId,
      requestedBy: actingUser._id,
      reason: data.reason,
      requestedCheckIn: data.requestedCheckIn ?? null,
      requestedCheckOut: data.requestedCheckOut ?? null,
      status: "pending",
    });
  }

  async reviewRequest(id, { status }, actingUser) {
    if (!["approved", "rejected"].includes(status)) {
      throw new Error('status must be either "approved" or "rejected"');
    }

    const request = await regularizationRequestRepository.findById(id);
    if (!request) throw new Error("Regularization request not found");
    TenantScope.assertAccess(
      actingUser,
      request,
      "Regularization request not found",
    );

    if (request.status !== "pending") {
      throw new Error("This request has already been reviewed");
    }

    if (status === "approved") {
      const attendanceUpdate = {};
      if (request.requestedCheckIn)
        attendanceUpdate.checkIn = request.requestedCheckIn;
      if (request.requestedCheckOut)
        attendanceUpdate.checkOut = request.requestedCheckOut;
      if (Object.keys(attendanceUpdate).length > 0) {
        await attendanceRepository.update(
          request.attendanceId,
          attendanceUpdate,
        );
      }
    }

    return await regularizationRequestRepository.update(id, {
      status,
      approvedBy: actingUser._id,
    });
  }
}

module.exports = new RegularizationRequestService();
