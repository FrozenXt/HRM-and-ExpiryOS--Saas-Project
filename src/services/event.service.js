const eventRepository = require("../repositories/event.repository");
const employeeRepository = require("../repositories/employee.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

const VALID_TYPES = [
  "birthday",
  "work_anniversary",
  "company_event",
  "meeting",
  "other",
];

class EventService {
  async getAll(searchHelper, actingUser) {
    const query = this._buildFilter(searchHelper, actingUser);
    const skip = (searchHelper.getPage() - 1) * searchHelper.getLimit();
    const limit = searchHelper.getLimit();
    const sort = this._buildSort(searchHelper);
    return eventRepository.findMany(query, { skip, limit, sort });
  }

  async getById(id, actingUser) {
    const doc = await eventRepository.findById(id);
    if (!doc)
      throw Object.assign(new Error("Event not found"), { statusCode: 404 });
    TenantScope.assertAccess(actingUser, doc, "Event not found");
    return doc;
  }

  async create(data, actingUser) {
    const companyId = TenantScope.resolveCompanyId(actingUser, data.companyId);

    if (!VALID_TYPES.includes(data.type)) {
      throw Object.assign(
        new Error(`type must be one of: ${VALID_TYPES.join(", ")}`),
        { statusCode: 400 },
      );
    }

    // birthday / work_anniversary require an employeeId
    const employeeId = data.employeeId?.trim() || null;
    if (["birthday", "work_anniversary"].includes(data.type) && !employeeId) {
      throw Object.assign(
        new Error(`employeeId is required for type=${data.type}`),
        { statusCode: 400 },
      );
    }

    // cross-company guard
    if (employeeId) {
      const emp = await employeeRepository.findById(employeeId);
      if (!emp || emp.companyId.toString() !== companyId.toString()) {
        throw Object.assign(
          new Error("employeeId must belong to the same company"),
          { statusCode: 400 },
        );
      }
    }

    return eventRepository.create({
      companyId,
      type: data.type,
      title: data.title,
      employeeId,
      date: data.date,
      description: data.description?.trim() || null,
      isRecurringYearly: !!data.isRecurringYearly,
      createdBy: actingUser._id,
    });
  }

  async update(id, data, actingUser) {
    const existing = await eventRepository.findById(id);
    if (!existing)
      throw Object.assign(new Error("Event not found"), { statusCode: 404 });
    TenantScope.assertAccess(actingUser, existing, "Event not found");

    // Ownership fields cannot be reassigned
    delete data.companyId;
    delete data.createdBy;

    if (data.type && !VALID_TYPES.includes(data.type)) {
      throw Object.assign(
        new Error(`type must be one of: ${VALID_TYPES.join(", ")}`),
        { statusCode: 400 },
      );
    }

    if ("employeeId" in data) {
      data.employeeId = data.employeeId?.trim() || null;
      if (data.employeeId) {
        const emp = await employeeRepository.findById(data.employeeId);
        if (
          !emp ||
          emp.companyId.toString() !== existing.companyId._id.toString()
        ) {
          throw Object.assign(
            new Error("employeeId must belong to the same company"),
            { statusCode: 400 },
          );
        }
      }
    }

    if ("description" in data) {
      data.description = data.description?.trim() || null;
    }

    return eventRepository.updateById(id, data);
  }

  async remove(id, actingUser) {
    const existing = await eventRepository.findById(id);
    if (!existing)
      throw Object.assign(new Error("Event not found"), { statusCode: 404 });
    TenantScope.assertAccess(actingUser, existing, "Event not found");
    await eventRepository.deleteById(id);
    return existing;
  }

  /* ---------- Filter + sort ---------- */

  _buildFilter(searchHelper, actingUser) {
    const query = {};

    // 1. Tenant scoping — always applied, never trust the client for this
    if (actingUser.role !== "super_admin") {
      query.companyId = TenantScope.resolveCompanyId(actingUser);
    }

    // 2. Everything the client sent via `fields: [{field, operator, value}]`
    const clientFilters = searchHelper.getFilters();
    Object.assign(query, clientFilters);

    // 3. Super admin can filter by company via fields; non-super-admin cannot
    //    override their own company (see step 1 above — it stays enforced).
    //    If you want to block them from even trying, delete companyId from
    //    clientFilters before merging.

    return query;
  }

  _buildSort(searchHelper) {
    // SearchHelper already normalises "id" → "_id" and ASC/DESC → 1/-1
    return searchHelper.getSort();
  }
}

module.exports = new EventService();
