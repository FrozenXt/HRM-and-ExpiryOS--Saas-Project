const GeofenceZone = require("../models/geofence-zone.model");

class GeofenceZoneRepository {
  async findAll(searchHelper, scopeFilter) {
    const filters = { ...searchHelper.getFilters(), ...scopeFilter };

    const [data, total] = await Promise.all([
      GeofenceZone.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit())
        .populate("companyId", "legalName")
        .lean(),
      GeofenceZone.countDocuments(filters),
    ]);

    return { data, total };
  }

  // Plain, unpaginated lookup for internal use (e.g. Attendance's geofence
  // check on check-in/out) — not for the list endpoint.
  async findAllActiveForCompany(companyId) {
    return await GeofenceZone.find({ companyId, isActive: true }).lean();
  }

  async findById(id, scopeFilter) {
    return await GeofenceZone.findOne({ _id: id, ...scopeFilter }).populate(
      "companyId",
      "legalName",
    );
  }

  async create(data) {
    return await GeofenceZone.create(data);
  }

  async update(id, scopeFilter, data) {
    return await GeofenceZone.findOneAndUpdate(
      { _id: id, ...scopeFilter },
      data,
      { new: true, runValidators: true },
    ).populate("companyId", "legalName");
  }

  async delete(id, scopeFilter) {
    return await GeofenceZone.findOneAndDelete({ _id: id, ...scopeFilter });
  }
}

module.exports = new GeofenceZoneRepository();
