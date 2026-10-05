const attendanceRepository = require("../repositories/attendance.repository");
const employeeRepository = require("../repositories/employee.repository");
const geofenceZoneRepository = require("../repositories/geofence-zone.repository");
const { distanceMeters } = require("../utils/geo.util");
const { attachEmployeeInfo } = require("../helpers/employee-info.helper");
const companySettingsRepository = require("../repositories/company-settings.repository");
const Shift = require("../models/shift.model");
const { checkWorkingDay } = require("../helpers/working-day.helper");
const {
  resolveEffectiveShift,
  windowForCheckIn,
  classifyCheckIn,
  statusAfterCheckOut,
} = require("../utils/shift.util");

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

  async _resolveGeofence(companyId, location) {
    if (!location || location.latitude == null || location.longitude == null) {
      return { geofenceId: null, isWithinGeofence: null };
    }

    const zones =
      await geofenceZoneRepository.findAllActiveForCompany(companyId);

    if (!zones.length) {
      return { geofenceId: null, isWithinGeofence: null };
    }

    let nearest = null;
    for (const zone of zones) {
      const distance = distanceMeters(
        location.latitude,
        location.longitude,
        zone.latitude,
        zone.longitude,
      );
      if (
        distance <= zone.radiusMeters &&
        (!nearest || distance < nearest.distance)
      ) {
        nearest = { zone, distance };
      }
    }

    return nearest
      ? { geofenceId: nearest.zone._id, isWithinGeofence: true }
      : { geofenceId: null, isWithinGeofence: false };
  }

  // The shift that applies to this employee (their own, or the company hours)
  // plus the company attendance policy.
  async _shiftContext(employee, companyId) {
    const [settingsDoc, shiftDoc] = await Promise.all([
      companySettingsRepository.findByCompanyId(companyId),
      employee.shiftId ? Shift.findById(employee.shiftId).lean() : null,
    ]);
    const settings = settingsDoc?.toObject
      ? settingsDoc.toObject()
      : settingsDoc || {};

    return {
      shift: resolveEffectiveShift(shiftDoc, settings),
      policy: settings.attendancePolicy || {},
    };
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
    const [enriched] = await attachEmployeeInfo([record]);
    return enriched;
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

  // Tells the UI whether today is a normal working day for this company
  // (not a holiday, not one of the week-off days from settings).
  async dayStatus(user) {
    return await checkWorkingDay(user.companyId);
  }

  async checkIn(user, location) {
    const employee = await employeeRepository.findByUserId(user._id);
    if (!employee) {
      const err = new Error("No employee profile linked to this user");
      err.statusCode = 404;
      throw err;
    }

    // No check-in on a holiday or a week-off day. The week-off days come
    // from the company settings, so they are different for every company.
    const dayCheck = await checkWorkingDay(user.companyId);
    if (!dayCheck.allowed) {
      const err = new Error(dayCheck.message);
      err.statusCode = 400;
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

    const { geofenceId, isWithinGeofence } = await this._resolveGeofence(
      user.companyId,
      location,
    );

    // Late or on time, judged against this employee's shift.
    const now = new Date();
    const { shift } = await this._shiftContext(employee, user.companyId);
    const status = classifyCheckIn(
      now,
      windowForCheckIn(now, shift),
      shift.graceMinutes,
    );

    if (existing) {
      return await attendanceRepository.update(
        existing._id,
        { companyId: user.companyId },
        {
          checkIn: now,
          checkInLocation: location || null,
          status,
          geofenceId,
          isWithinGeofence,
        },
      );
    }

    return await attendanceRepository.create({
      employeeId: employee._id,
      companyId: user.companyId,
      date: today,
      checkIn: now,
      checkInLocation: location || null,
      status,
      geofenceId,
      isWithinGeofence,
    });
  }

  async checkOut(user, location) {
    const employee = await employeeRepository.findByUserId(user._id);
    if (!employee) {
      const err = new Error("No employee profile linked to this user");
      err.statusCode = 404;
      throw err;
    }

    // The open check-in, even if it started yesterday (night shifts check
    // out after midnight, so looking up "today's" record would miss it).
    const existing = await attendanceRepository.findOpenForEmployee(
      employee._id,
    );
    if (!existing) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todays = await attendanceRepository.findByEmployeeAndDate(
        employee._id,
        today,
      );
      const err = new Error(
        todays && todays.checkOut
          ? "Already checked out today"
          : "You must check in before checking out",
      );
      err.statusCode = 400;
      throw err;
    }

    const { geofenceId, isWithinGeofence } = await this._resolveGeofence(
      user.companyId,
      location,
    );

    // Full day / half day / absent, from hours worked against the shift.
    const now = new Date();
    const { shift, policy } = await this._shiftContext(
      employee,
      user.companyId,
    );
    const status = statusAfterCheckOut({
      currentStatus: existing.status,
      checkIn: existing.checkIn,
      checkOut: now,
      shift,
      policy,
    });

    return await attendanceRepository.update(
      existing._id,
      { companyId: user.companyId },
      {
        checkOut: now,
        checkOutLocation: location || null,
        status,
        geofenceId,
        isWithinGeofence,
      },
    );
  }
}

module.exports = new AttendanceService();
