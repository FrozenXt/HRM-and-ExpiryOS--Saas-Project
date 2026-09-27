const announcementRepository = require("../repositories/announcement.repository");
const departmentRepository = require("../repositories/department.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

const VALID_AUDIENCES = ["all", "department", "role"];

class AnnouncementService {
  async getAll(searchHelper, actingUser) {
    const query = this._buildFilter(searchHelper, actingUser);
    const skip = (searchHelper.getPage() - 1) * searchHelper.getLimit();
    const limit = searchHelper.getLimit();
    const sort = this._buildSort(searchHelper);
    return announcementRepository.findMany(query, { skip, limit, sort });
  }

  async getById(id, actingUser) {
    const doc = await announcementRepository.findById(id);
    if (!doc)
      throw Object.assign(new Error("Announcement not found"), {
        statusCode: 404,
      });
    TenantScope.assertAccess(actingUser, doc, "Announcement not found");
    return doc;
  }

  async create(data, actingUser) {
    const companyId = TenantScope.resolveCompanyId(actingUser, data.companyId);

    if (!VALID_AUDIENCES.includes(data.audience)) {
      throw Object.assign(
        new Error(`audience must be one of: ${VALID_AUDIENCES.join(", ")}`),
        { statusCode: 400 },
      );
    }

    const departmentId = data.departmentId?.trim() || null;
    if (data.audience === "department" && !departmentId) {
      throw Object.assign(
        new Error("departmentId is required when audience=department"),
        { statusCode: 400 },
      );
    }

    if (departmentId) {
      const dept = await departmentRepository.findById(departmentId);
      if (!dept || dept.companyId.toString() !== companyId.toString()) {
        throw Object.assign(
          new Error("departmentId must belong to the same company"),
          { statusCode: 400 },
        );
      }
    }

    return announcementRepository.create({
      companyId,
      title: data.title,
      message: data.message,
      audience: data.audience,
      departmentId,
      attachmentUrl: data.attachmentUrl?.trim() || null,
      postedBy: actingUser._id,
      publishedAt: data.publishedAt ?? new Date(),
    });
  }

  async update(id, data, actingUser) {
    const existing = await announcementRepository.findById(id);
    if (!existing)
      throw Object.assign(new Error("Announcement not found"), {
        statusCode: 404,
      });
    TenantScope.assertAccess(actingUser, existing, "Announcement not found");

    delete data.companyId;
    delete data.postedBy;

    if (data.audience && !VALID_AUDIENCES.includes(data.audience)) {
      throw Object.assign(
        new Error(`audience must be one of: ${VALID_AUDIENCES.join(", ")}`),
        { statusCode: 400 },
      );
    }

    if ("departmentId" in data) {
      data.departmentId = data.departmentId?.trim() || null;
      if (data.departmentId) {
        const dept = await departmentRepository.findById(data.departmentId);
        if (
          !dept ||
          dept.companyId.toString() !== existing.companyId._id.toString()
        ) {
          throw Object.assign(
            new Error("departmentId must belong to the same company"),
            { statusCode: 400 },
          );
        }
      }
    }

    if ("attachmentUrl" in data) {
      data.attachmentUrl = data.attachmentUrl?.trim() || null;
    }

    return announcementRepository.updateById(id, data);
  }

  async remove(id, actingUser) {
    const existing = await announcementRepository.findById(id);
    if (!existing)
      throw Object.assign(new Error("Announcement not found"), {
        statusCode: 404,
      });
    TenantScope.assertAccess(actingUser, existing, "Announcement not found");
    await announcementRepository.deleteById(id);
    return existing;
  }

  /* ---------- Custom: my feed ---------- */
  /**
   * Returns announcements visible to the acting user:
   * - audience=all always visible
   * - audience=department visible only if user's departmentId matches
   * - audience=role visible only if user's role is in `targetRoles`
   *     (assumes your Announcement model carries a `targetRoles: [String]`
   *      field — add it if you want role-based audience)
   */
  async getMyFeed(actingUser, searchHelper) {
    const companyId = TenantScope.resolveCompanyId(actingUser);

    const or = [
      { audience: "all" },
      { audience: "department", departmentId: actingUser.departmentId || null },
      { audience: "role", targetRoles: actingUser.role },
    ];

    const query = { companyId, $or: or };

    const skip = (searchHelper.getPage() - 1) * searchHelper.getLimit();
    const limit = searchHelper.getLimit();

    return announcementRepository.findMany(query, {
      skip,
      limit,
      sort: { publishedAt: -1 },
    });
  }

  /* ---------- Filter + sort ---------- */

  _buildFilter(searchHelper, actingUser) {
    const query = {};

    if (actingUser.role !== "super_admin") {
      query.companyId = TenantScope.resolveCompanyId(actingUser);
    }

    Object.assign(query, searchHelper.getFilters());
    return query;
  }

  _buildSort(searchHelper) {
    return searchHelper.getSort();
  }
}

module.exports = new AnnouncementService();
