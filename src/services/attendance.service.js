// services/attendance.service.js
const attendanceRepository = require("../repositories/attendance.repository");
const employeeRepository = require("../repositories/employee.repository");

class AttendanceService {
  // Staff only ever see/act on their own record; admin/hr see the whole company.
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
    return await attendanceRepository.findAll(searchHelper, scope);
  }

  async getById(id, user) {
    const scope = await this._scopeFor(user);
    const record = await attendanceRepository.findById(id, scope);
    if (!record) {
      const err = new Error("Attendance record not found");
      err.statusCode = 404;
      throw err;
    }
    return record;
  }

  async create(data, user) {
    // Manual entry by admin/hr only — self check-in goes through checkIn().
    return await attendanceRepository.create({
      ...data,
      companyId: user.companyId,
    });
  }

  async update(id, data, user) {
    const scope = await this._scopeFor(user);
    const record = await attendanceRepository.update(id, scope, data);
    if (!record) {
      const err = new Error("Attendance record not found");
      err.statusCode = 404;
      throw err;
    }
    return record;
  }

  async remove(id, user) {
    const scope = await this._scopeFor(user);
    const record = await attendanceRepository.delete(id, scope);
    if (!record) {
      const err = new Error("Attendance record not found");
      err.statusCode = 404;
      throw err;
    }
    return record;
  }

  async checkIn(user, location) {
    const employee = await employeeRepository.findByUserId(user._id);
    if (!employee) {
      const err = new Error("No employee profile linked to this user");
      err.statusCode = 404;
      throw err;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await attendanceRepository.findByEmployeeAndDate(
      employee._id,
      today,
    );
    if (existing && existing.checkIn) {
      const err = new Error("Already checked in today");
      err.statusCode = 400;
      throw err;
    }

    if (existing) {
      return await attendanceRepository.update(
        existing._id,
        { companyId: user.companyId },
        { checkIn: new Date(), checkInLocation: location || null },
      );
    }

    return await attendanceRepository.create({
      employeeId: employee._id,
      companyId: user.companyId,
      date: today,
      checkIn: new Date(),
      checkInLocation: location || null,
      status: "present",
    });
  }

  async checkOut(user, location) {
    const employee = await employeeRepository.findByUserId(user._id);
    if (!employee) {
      const err = new Error("No employee profile linked to this user");
      err.statusCode = 404;
      throw err;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await attendanceRepository.findByEmployeeAndDate(
      employee._id,
      today,
    );
    if (!existing || !existing.checkIn) {
      const err = new Error("You must check in before checking out");
      err.statusCode = 400;
      throw err;
    }
    if (existing.checkOut) {
      const err = new Error("Already checked out today");
      err.statusCode = 400;
      throw err;
    }

    return await attendanceRepository.update(
      existing._id,
      { companyId: user.companyId },
      { checkOut: new Date(), checkOutLocation: location || null },
    );
  }
}

module.exports = new AttendanceService();
