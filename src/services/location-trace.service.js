const locationTraceRepository = require("../repositories/location-trace.repository");
const deviceSessionRepository = require("../repositories/device-session.repository");
const employeeRepository = require("../repositories/employee.repository");

async function ownEmployee(user) {
  const employee = await employeeRepository.findByUserId(user._id);
  if (!employee) {
    const err = new Error("No employee profile linked to this user");
    err.statusCode = 404;
    throw err;
  }
  return employee;
}

class LocationTraceService {
  // Staff see only their own traces; admin/hr the whole company;
  // super_admin all.
  async _scopeFor(user) {
    const scope = {};
    if (user.role !== "super_admin") scope.companyId = user.companyId;
    if (user.role === "staff") scope.employeeId = (await ownEmployee(user))._id;
    return scope;
  }

  async getAll(searchHelper, user) {
    return await locationTraceRepository.findAll(
      searchHelper,
      await this._scopeFor(user),
    );
  }

  async getById(id, user) {
    const trace = await locationTraceRepository.findById(
      id,
      await this._scopeFor(user),
    );
    if (!trace) {
      const err = new Error("Location trace not found");
      err.statusCode = 404;
      throw err;
    }
    return trace;
  }

  // Written by the employee's own app. employeeId/companyId come from the
  // token, never the body. Append-only: there is deliberately no update.
  async create(data, user) {
    const employee = await ownEmployee(user);

    if (data.latitude == null || data.longitude == null) {
      const err = new Error("latitude and longitude are required");
      err.statusCode = 400;
      throw err;
    }
    if (!data.source) {
      const err = new Error("source is required");
      err.statusCode = 400;
      throw err;
    }

    // A trace may only point at one of the caller's own device sessions.
    if (data.sessionId) {
      const session = await deviceSessionRepository.findById(data.sessionId, {
        companyId: user.companyId,
        employeeId: employee._id,
      });
      if (!session) {
        const err = new Error("Device session not found for this employee");
        err.statusCode = 400;
        throw err;
      }
    }

    return await locationTraceRepository.create({
      sessionId: data.sessionId || null,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracyMeters: data.accuracyMeters ?? null,
      capturedAt: data.capturedAt || new Date(), // apps batching offline points send their own
      deviceId: data.deviceId || null,
      source: data.source,
      employeeId: employee._id,
      companyId: user.companyId,
    });
  }

  // Admin/HR/Super Admin only (enforced by route authorize).
  async remove(id, user) {
    const scope =
      user.role === "super_admin" ? {} : { companyId: user.companyId };
    const trace = await locationTraceRepository.delete(id, scope);
    if (!trace) {
      const err = new Error("Location trace not found");
      err.statusCode = 404;
      throw err;
    }
    return trace;
  }
}

module.exports = new LocationTraceService();
