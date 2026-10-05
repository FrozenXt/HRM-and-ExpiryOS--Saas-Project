const AuditLog = require("../models/audit-log.model");

const USER_POPULATE = {
  path: "userId",
  select: "firstName lastName email role",
};
const COMPANY_POPULATE = { path: "companyId", select: "legalName tradeName" };
// No select() here — the target model varies by entityType (refPath), so we
// can't safely name fields that exist on every possible model. If you want
// leaner payloads, filter fields client-side or add a per-entityType select
// map here.
const ENTITY_POPULATE = { path: "entityId" };

class AuditLogRepository {
  async findAll(searchHelper, scopeFilter) {
    const filters = { ...searchHelper.getFilters(), ...scopeFilter };

    const [data, total] = await Promise.all([
      AuditLog.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit())
        .populate(USER_POPULATE)
        .populate(COMPANY_POPULATE)
        .populate(ENTITY_POPULATE)
        .lean(),
      AuditLog.countDocuments(filters),
    ]);

    return { data, total };
  }

  async findById(id, scopeFilter) {
    return await AuditLog.findOne({ _id: id, ...scopeFilter })
      .populate(USER_POPULATE)
      .populate(COMPANY_POPULATE)
      .populate(ENTITY_POPULATE);
  }

  async create(data) {
    return await AuditLog.create(data);
  }
}

module.exports = new AuditLogRepository();
