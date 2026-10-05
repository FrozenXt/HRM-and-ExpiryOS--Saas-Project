const deviceSessionRepository = require("../repositories/device-session.repository");
const employeeRepository = require("../repositories/employee.repository");

// The caller's own employee profile — the only identity we trust for
// writing monitoring data, never a body-supplied employeeId.
async function ownEmployee(user) {
  const employee = await employeeRepository.findByUserId(user._id);
  if (!employee) {
    const err = new Error("No employee profile linked to this user");
    err.statusCode = 404;
    throw err;
  }
  return employee;
}

class DeviceSessionService {
  // Staff see only their own sessions; admin/hr the whole company;
  // super_admin all.
  async _scopeFor(user) {
    const scope = {};
    if (user.role !== "super_admin") scope.companyId = user.companyId;
    if (user.role === "staff") scope.employeeId = (await ownEmployee(user))._id;
    return scope;
  }

  async getAll(searchHelper, user) {
    return await deviceSessionRepository.findAll(
      searchHelper,
      await this._scopeFor(user),
    );
  }

  async getById(id, user) {
    const session = await deviceSessionRepository.findById(
      id,
      await this._scopeFor(user),
    );
    if (!session) {
      const err = new Error("Device session not found");
      err.statusCode = 404;
      throw err;
    }
    return session;
  }

  // Started by the employee's own app. employeeId/companyId come from the
  // token, so nobody can open a session under someone else's name.
  async create(data, user) {
    const employee = await ownEmployee(user);
    if (!data.deviceId) {
      const err = new Error("deviceId is required");
      err.statusCode = 400;
      throw err;
    }
    if (!data.deviceType) {
      const err = new Error("deviceType is required");
      err.statusCode = 400;
      throw err;
    }
    return await deviceSessionRepository.create({
      deviceId: data.deviceId,
      deviceType: data.deviceType,
      os: data.os,
      appVersion: data.appVersion,
      ipAddress: data.ipAddress || null,
      sessionStart: data.sessionStart || new Date(),
      employeeId: employee._id,
      companyId: user.companyId,
    });
  }

  // Owner only, and only the fields that legitimately change during a
  // session's life (closing it, app upgrade, IP change) — start time and
  // device identity are immutable.
  async update(id, data, user) {
    const employee = await ownEmployee(user);
    const payload = {};
    for (const key of ["sessionEnd", "appVersion", "ipAddress"]) {
      if (data[key] !== undefined) payload[key] = data[key];
    }
    const session = await deviceSessionRepository.update(
      id,
      { companyId: user.companyId, employeeId: employee._id },
      payload,
    );
    if (!session) {
      const err = new Error("Device session not found");
      err.statusCode = 404;
      throw err;
    }
    return session;
  }

  // Admin/HR/Super Admin only (enforced by route authorize).
  async remove(id, user) {
    const scope =
      user.role === "super_admin" ? {} : { companyId: user.companyId };
    const session = await deviceSessionRepository.delete(id, scope);
    if (!session) {
      const err = new Error("Device session not found");
      err.statusCode = 404;
      throw err;
    }
    return session;
  }
}

module.exports = new DeviceSessionService();
