const regularizationRequestRepository = require("../repositories/regularization-request.repository");
const attendanceRepository = require("../repositories/attendance.repository");
const employeeRepository = require("../repositories/employee.repository");
const TenantScope = require("../helpers/tenant-scope.helper");
const { notify, notifyBulk } = require("./notification.service");
const User = require("../models/user.model");
const Employee = require("../models/employee.model");

// Local calendar date as YYYY-MM-DD.
const day = (d) => new Date(d).toLocaleDateString("en-CA");
const fullName = (u) =>
  u ? `${u.firstName} ${u.lastName || ""}`.trim() : "An employee";

class RegularizationRequestService {
  async _getActingEmployeeId(actingUser) {
    if (actingUser.role !== "staff") return null;
    const employee = await employeeRepository.findByUserId(actingUser._id);
    if (!employee)
      throw new Error("No employee profile found for this account");
    return employee._id;
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

  // Tells Admin/HR about a new request (and the employee, if someone else
  // submitted it for them). Never throws.
  async _notifyCreated(request, attendance, actingUser) {
    try {
      const emp = await Employee.findById(request.employeeId)
        .select("userId")
        .lean();
      if (!emp) return;

      const employeeUser = await User.findById(emp.userId)
        .select("firstName lastName")
        .lean();
      const name = fullName(employeeUser);
      const when = day(attendance.date);

      const adminIds = await this._adminHrIds(request.companyId, [
        actingUser._id,
      ]);

      await Promise.all(
        adminIds.map((userId) =>
          notify({
            userId,
            companyId: request.companyId,
            type: "regularization_requested",
            title: "New regularization request",
            message: `${name} requested an attendance correction for ${when}.`,
            link: "/regularization-requests",
            entityType: "RegularizationRequest",
            entityId: request._id,
            email: { templateCode: "generic" },
          }),
        ),
      );

      // Submitted by someone else on the employee's behalf.
      if (String(emp.userId) !== String(actingUser._id)) {
        await notify({
          userId: emp.userId,
          companyId: request.companyId,
          type: "regularization_requested",
          title: "Regularization request submitted",
          message: `A correction request was submitted for your attendance on ${when}.`,
          link: "/regularization-requests",
          entityType: "RegularizationRequest",
          entityId: request._id,
        });
      }
    } catch (err) {
      console.error("[regularization] notify failed:", err.message);
    }
  }

  // Tells the employee the result (in-app + email), and the other
  // Admin/HR users in-app. Never throws.
  async _notifyReviewed(request, status, actingUser) {
    try {
      const [emp, attendance] = await Promise.all([
        Employee.findById(request.employeeId).select("userId").lean(),
        attendanceRepository.findById(request.attendanceId),
      ]);
      if (!emp) return;

      const employeeUser = await User.findById(emp.userId)
        .select("firstName lastName")
        .lean();
      const name = fullName(employeeUser);
      const when = attendance ? day(attendance.date) : "the requested day";
      const reviewer = fullName(actingUser);

      await notify({
        userId: emp.userId,
        companyId: request.companyId,
        type: `regularization_${status}`,
        title: `Regularization ${status}`,
        message: `Your attendance correction for ${when} was ${status} by ${reviewer}.`,
        link: "/regularization-requests",
        entityType: "RegularizationRequest",
        entityId: request._id,
        email: {
          templateCode: "generic",
        },
      });

      // Other Admin/HR users, so nobody reviews it twice.
      const adminIds = await this._adminHrIds(request.companyId, [
        actingUser._id,
        emp.userId,
      ]);
      await notifyBulk(adminIds, {
        companyId: request.companyId,
        type: `regularization_${status}`,
        title: `Regularization ${status}`,
        message: `${reviewer} ${status} ${name}'s correction for ${when}.`,
        link: "/regularization-requests",
        entityType: "RegularizationRequest",
        entityId: request._id,
      });
    } catch (err) {
      console.error("[regularization] notify failed:", err.message);
    }
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
    const [enriched] = await regularizationRequestRepository.enrich([request]);
    return enriched;
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

    const created = await regularizationRequestRepository.create({
      attendanceId: attendance._id,
      employeeId: attendance.employeeId,
      companyId: attendance.companyId,
      requestedBy: actingUser._id,
      reason: data.reason,
      requestedCheckIn: data.requestedCheckIn ?? null,
      requestedCheckOut: data.requestedCheckOut ?? null,
      status: "pending",
    });

    await this._notifyCreated(created, attendance, actingUser);

    return created;
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
          { companyId: request.companyId },
          attendanceUpdate,
        );
      }
    }

    const updated = await regularizationRequestRepository.update(id, {
      status,
      approvedBy: actingUser._id,
    });

    await this._notifyReviewed(request, status, actingUser);

    return updated;
  }
}

module.exports = new RegularizationRequestService();
