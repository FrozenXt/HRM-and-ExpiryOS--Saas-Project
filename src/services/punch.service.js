const employeeRepository = require("../repositories/employee.repository");
const punchLogRepository = require("../repositories/punch-log.repository");
const attendanceService = require("./attendance.service");
const User = require("../models/user.model");

// Kiosk punches are unauthenticated (no JWT) — the employee identifies
// themselves with employeeId + a 4-digit PIN. Everything after that reuses
// the exact same attendance service that the JWT flow uses, so shift rules,
// geofencing, late classification, and notifications all apply identically.
class PunchService {
  // Resolve employeeId → Employee → User, and check the PIN.
  // Throws a clean error for each failure mode so the controller can map
  // it to a proper HTTP status without leaking which part was wrong.
  async _resolveEmployeeAndUser(employeeId, pin) {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      const err = new Error("Employee not found");
      err.statusCode = 404;
      throw err;
    }

    const user = await User.findById(employee.userId).select("+pinHash");
    if (!user) {
      const err = new Error("No user account linked to this employee");
      err.statusCode = 404;
      throw err;
    }

    if (user.status !== "active") {
      const err = new Error("Account is not active");
      err.statusCode = 403;
      throw err;
    }

    if (!user.pinHash) {
      const err = new Error("No PIN set for this employee. Ask HR to set one.");
      err.statusCode = 400;
      throw err;
    }

    const pinOk = await user.verifyPin(pin);
    if (!pinOk) {
      const err = new Error("Invalid PIN");
      err.statusCode = 401;
      throw err;
    }

    return { employee, user };
  }

  // Public kiosk entry point. `type` is "in" or "out".
  // `deviceId` and `location` are optional — the kiosk can send them,
  // the mobile app later definitely will.
  async punch({ employeeId, pin, type, deviceId = null, location = null }) {
    if (type !== "in" && type !== "out") {
      const err = new Error('type must be "in" or "out"');
      err.statusCode = 400;
      throw err;
    }

    const { employee, user } = await this._resolveEmployeeAndUser(
      employeeId,
      pin,
    );

    // From here on we call the real attendance service. It applies the
    // working-day check, shift, geofence, late classification, and fires
    // the notifications — identical to a JWT-authenticated check-in.
    let attendanceRecord = null;
    let result = "accepted";
    let rejectionReason = null;

    try {
      attendanceRecord =
        type === "in"
          ? await attendanceService.checkIn(user, location)
          : await attendanceService.checkOut(user, location);
    } catch (error) {
      result = "rejected";
      rejectionReason = error.message;
      // Still log the rejected attempt — that's the whole point of the audit.
      await punchLogRepository.record({
        companyId: employee.companyId,
        employeeId: employee._id,
        userId: user._id,
        type,
        source: "kiosk",
        deviceId,
        location,
        result,
        rejectionReason,
        pinVerified: true,
        attendanceId: null,
      });
      // Re-throw so the controller returns the right status code.
      throw error;
    }

    // Accepted — log it and link back to the attendance row.
    await punchLogRepository.record({
      companyId: employee.companyId,
      employeeId: employee._id,
      userId: user._id,
      type,
      source: "kiosk",
      deviceId,
      location,
      result: "accepted",
      rejectionReason: null,
      pinVerified: true,
      attendanceId: attendanceRecord._id,
    });

    return {
      employee: {
        _id: employee._id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        profileImage: user.profileImage || null,
      },
      type,
      punchedAt:
        type === "in" ? attendanceRecord.checkIn : attendanceRecord.checkOut,
      status: attendanceRecord.status,
      attendanceId: attendanceRecord._id,
    };
  }

  // Live board for the kiosk / admin — most recent punches for a company.
  async recentPunches(companyId, options) {
    return await punchLogRepository.findRecentByCompany(companyId, options);
  }

  // One employee's punch history (admin/HR view on the employee profile).
  async employeeHistory(employeeId, options) {
    return await punchLogRepository.findByEmployee(employeeId, options);
  }
}

module.exports = new PunchService();
