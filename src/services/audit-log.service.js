const auditLogRepository = require("../repositories/audit-log.repository");

class AuditLogService {
  // Audit logs are a compliance/security surface — staff never see them.
  // admin/hr see their own company's (including any company-less/global
  // entries would only ever be visible to super_admin, since they have no
  // companyId to match against). super_admin sees everything.
  _scopeFor(user) {
    return user.role === "super_admin" ? {} : { companyId: user.companyId };
  }

  async getAll(searchHelper, user) {
    return await auditLogRepository.findAll(searchHelper, this._scopeFor(user));
  }

  async getById(id, user) {
    const log = await auditLogRepository.findById(id, this._scopeFor(user));
    if (!log) {
      const err = new Error("Audit log not found");
      err.statusCode = 404;
      throw err;
    }
    return log;
  }

  // Admin/HR/Super Admin only (enforced by route authorize) — for manually
  // recording something outside normal request flow. Most entries should
  // come from record() below, called directly by the code performing the
  // action, so it can capture the real before/after and ip.
  async create(data, user) {
    if (!data.action) {
      const err = new Error("action is required");
      err.statusCode = 400;
      throw err;
    }
    if (!data.entityType) {
      const err = new Error("entityType is required");
      err.statusCode = 400;
      throw err;
    }
    if (!data.entityId) {
      const err = new Error("entityId is required");
      err.statusCode = 400;
      throw err;
    }

    return await auditLogRepository.create({
      ...data,
      userId: data.userId || user._id,
      companyId: data.companyId ?? user.companyId ?? null,
    });
  }

  /**
   * Plain helper for other backend code to call directly when something
   * worth auditing happens (e.g. a company's subscriptionStatus changed).
   * entityType must exactly match a registered mongoose model name (it's
   * used as the refPath target for populating entityId later).
   *
   * Usage:
   *   await auditLogService.record({
   *     userId: req.user._id,
   *     companyId: req.user.companyId,
   *     action: "update",
   *     entityType: "Company",
   *     entityId: company._id,
   *     before, after,
   *     ip: req.ip,
   *   });
   */
  async record({
    userId,
    companyId,
    action,
    entityType,
    entityId,
    before,
    after,
    ip,
  }) {
    return await auditLogRepository.create({
      userId,
      companyId: companyId ?? null,
      action,
      entityType,
      entityId,
      before: before ?? null,
      after: after ?? null,
      ip: ip ?? null,
    });
  }
}

module.exports = new AuditLogService();
