const interviewRepository = require("../repositories/interview.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

class InterviewService {
  /* Called by BaseTenantController.index */
  async getAll(searchHelper, actingUser) {
    const query = this._buildFilter(searchHelper, actingUser);
    const skip = (searchHelper.getPage() - 1) * searchHelper.getLimit();
    const limit = searchHelper.getLimit();
    const sort = this._buildSort(searchHelper);

    return interviewRepository.findMany(query, { skip, limit, sort });
  }

  /* Called by BaseTenantController.show */
  async getById(id, actingUser) {
    const doc = await interviewRepository.findById(id);
    if (!doc) {
      throw Object.assign(new Error("Interview not found"), {
        statusCode: 404,
      });
    }
    TenantScope.assertSameCompany(actingUser, doc.companyId);
    return doc;
  }

  /* Called by BaseTenantController.store */
  async create(data, actingUser) {
    const companyId = TenantScope.resolveCompanyId(actingUser, data.companyId);
    return interviewRepository.create({ ...data, companyId });
  }

  /* Called by BaseTenantController.update */
  async update(id, data, actingUser) {
    const existing = await interviewRepository.findById(id);
    if (!existing) {
      throw Object.assign(new Error("Interview not found"), {
        statusCode: 404,
      });
    }
    TenantScope.assertSameCompany(actingUser, existing.companyId);

    // Prevent reassignment of ownership fields
    delete data.companyId;

    return interviewRepository.updateById(id, data);
  }

  /* Called by BaseTenantController.destroy */
  async remove(id, actingUser) {
    const existing = await interviewRepository.findById(id);
    if (!existing) {
      throw Object.assign(new Error("Interview not found"), {
        statusCode: 404,
      });
    }
    TenantScope.assertSameCompany(actingUser, existing.companyId);
    await interviewRepository.deleteById(id);
  }

  /* ------------------------------------------------------------------ */
  /* Private — filter + sort based on SearchHelper                       */
  /* ------------------------------------------------------------------ */

  _buildFilter(searchHelper, actingUser) {
    const query = {};

    // Tenant scoping
    if (actingUser.role !== "super_admin") {
      query.companyId = TenantScope.resolveCompanyId(actingUser);
    } else if (searchHelper.get("companyId")) {
      query.companyId = searchHelper.get("companyId");
    }

    // Direct field filters
    const candidateId = searchHelper.get("candidateId");
    if (candidateId) query.candidateId = candidateId;

    const status = searchHelper.get("status");
    if (status) query.status = status;

    const mode = searchHelper.get("mode");
    if (mode) query.mode = mode;

    const round = searchHelper.get("round");
    if (round != null) query.round = Number(round);

    // Date range on scheduledAt
    const from = searchHelper.get("scheduledFrom");
    const to = searchHelper.get("scheduledTo");
    if (from || to) {
      query.scheduledAt = {};
      if (from) query.scheduledAt.$gte = new Date(from);
      if (to) query.scheduledAt.$lte = new Date(to);
    }

    // Free-text search across round / feedback / mode — SearchHelper's
    // own text field (whatever you've named it — usually `search` or `q`).
    const search = searchHelper.get("search") || searchHelper.get("q");
    if (search) {
      const rx = new RegExp(search, "i");
      // Only searches string fields on the Interview doc. Candidate/company
      // text search would require $lookup; add later if needed.
      query.$or = [{ feedback: rx }, { mode: rx }, { status: rx }];
    }

    return query;
  }

  _buildSort(searchHelper) {
    const field = searchHelper.get("sort_field") || "scheduledAt";
    const dir =
      (searchHelper.get("sort") || "DESC").toUpperCase() === "ASC" ? 1 : -1;
    return { [field]: dir };
  }
}

module.exports = new InterviewService();
