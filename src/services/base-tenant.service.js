const TenantScope = require("../helpers/tenant-scope.helper");

/**
 * Shared business logic for simple tenant-scoped CRUD collections.
 *
 * - Every read is scoped so Admin/HR only ever see their own company
 *   (Super Admin bypasses, per the isolation rule).
 * - `uniqueFields` lets a subclass declare which fields must be unique
 *   *within a company* (not globally) — e.g. two companies can each have
 *   a "Sales" department, but one company can't have two.
 * - companyId can never be changed via update, even by Super Admin —
 *   moving a record to a different tenant isn't a thing this API does.
 */
class BaseTenantService {
  constructor(repository, notFoundMessage, uniqueFields = []) {
    this.repository = repository;
    this.notFoundMessage = notFoundMessage;
    this.uniqueFields = uniqueFields;
  }

  async getAll(searchHelper, actingUser) {
    const scopeFilters = TenantScope.scopeFilters(actingUser);

    return await this.repository.findAll(searchHelper, scopeFilters);
  }

  async getById(id, actingUser) {
    const doc = await this.repository.findById(id);

    if (!doc) {
      throw new Error(this.notFoundMessage);
    }

    TenantScope.assertAccess(actingUser, doc, this.notFoundMessage);

    return doc;
  }

  async _assertUnique(companyId, data, excludeId = null) {
    for (const field of this.uniqueFields) {
      if (data[field] === undefined) continue;

      const existing = await this.repository.findByField(
        companyId,
        field,
        data[field],
        excludeId,
      );

      if (existing) {
        throw new Error(
          `A record with this ${field} already exists in this company`,
        );
      }
    }
  }

  async create(data, actingUser) {
    const companyId = TenantScope.resolveCompanyId(actingUser, data.companyId);

    await this._assertUnique(companyId, data);

    return await this.repository.create({ ...data, companyId });
  }

  async update(id, data, actingUser) {
    const doc = await this.repository.findById(id);

    if (!doc) {
      throw new Error(this.notFoundMessage);
    }

    TenantScope.assertAccess(actingUser, doc, this.notFoundMessage);

    // companyId is fixed at creation — never reassignable via update.
    const { companyId, ...safeData } = data;

    await this._assertUnique(doc.companyId, safeData, id);

    return await this.repository.update(id, safeData);
  }

  async remove(id, actingUser) {
    const doc = await this.repository.findById(id);

    if (!doc) {
      throw new Error(this.notFoundMessage);
    }

    TenantScope.assertAccess(actingUser, doc, this.notFoundMessage);

    await this.repository.delete(id);

    return doc;
  }
}

module.exports = BaseTenantService;
