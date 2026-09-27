const geofenceZoneRepository = require("../repositories/geofence-zone.repository");

class GeofenceZoneService {
  // Everyone (including staff) reads within their own company — a field
  // employee's app needs to know the active zones to validate check-in
  // location against. super_admin sees all companies. Writes are gated to
  // admin/hr/super_admin at the route level, not here.
  _scopeFor(user) {
    return user.role === "super_admin" ? {} : { companyId: user.companyId };
  }

  async getAll(searchHelper, user) {
    const scope = this._scopeFor(user);
    return await geofenceZoneRepository.findAll(searchHelper, scope);
  }

  async getById(id, user) {
    const scope = this._scopeFor(user);
    const zone = await geofenceZoneRepository.findById(id, scope);
    if (!zone) {
      const err = new Error("Geofence zone not found");
      err.statusCode = 404;
      throw err;
    }
    return zone;
  }

  // Admin/HR/Super Admin only (enforced by route authorize).
  async create(data, user) {
    const companyId =
      user.role === "super_admin" ? data.companyId : user.companyId;
    if (!companyId) {
      const err = new Error("companyId is required");
      err.statusCode = 400;
      throw err;
    }
    if (!data.name) {
      const err = new Error("name is required");
      err.statusCode = 400;
      throw err;
    }
    if (data.latitude == null || data.longitude == null) {
      const err = new Error("latitude and longitude are required");
      err.statusCode = 400;
      throw err;
    }
    if (!data.radiusMeters || data.radiusMeters <= 0) {
      const err = new Error("radiusMeters must be a positive number");
      err.statusCode = 400;
      throw err;
    }

    return await geofenceZoneRepository.create({ ...data, companyId });
  }

  // Admin/HR/Super Admin only (enforced by route authorize).
  async update(id, data, user) {
    const scope = this._scopeFor(user);
    const zone = await geofenceZoneRepository.update(id, scope, data);
    if (!zone) {
      const err = new Error("Geofence zone not found");
      err.statusCode = 404;
      throw err;
    }
    return zone;
  }

  // Admin/HR/Super Admin only (enforced by route authorize).
  async remove(id, user) {
    const scope = this._scopeFor(user);
    const zone = await geofenceZoneRepository.delete(id, scope);
    if (!zone) {
      const err = new Error("Geofence zone not found");
      err.statusCode = 404;
      throw err;
    }
    return zone;
  }
}

module.exports = new GeofenceZoneService();
