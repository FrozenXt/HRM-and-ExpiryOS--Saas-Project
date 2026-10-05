const eventRepository = require("../repositories/event.repository");
const employeeRepository = require("../repositories/employee.repository");
const TenantScope = require("../helpers/tenant-scope.helper");
const { notify, notifyBulk, adminHrIds } = require("./notification.service");

const VALID_TYPES = [
  "birthday",
  "work_anniversary",
  "company_event",
  "meeting",
  "other",
];

const fullName = (u) =>
  u ? `${u.firstName} ${u.lastName || ""}`.trim() : "Someone";

const day = (d) => new Date(d).toLocaleDateString("en-CA");

class EventService {
  // Linked employee (if any): in-app. Admin/HR: in-app. Never throws, so a
  // notification problem can't make event creation fail.
  async _notifyCreated(event, employee, actingUser) {
    try {
      const companyId = event.companyId;
      const when = event.date ? ` on ${day(event.date)}` : "";
      const employeeUserId = employee?.userId ? String(employee.userId) : null;

      if (employeeUserId && employeeUserId !== String(actingUser._id)) {
        await notify({
          userId: employeeUserId,
          companyId,
          type: "event_created",
          title: "New event",
          message: `An event was added for you: "${event.title}"${when}.`,
          link: "/events",
          entityType: "Event",
          entityId: event._id,
        });
      }

      const skip = [actingUser._id];
      if (employeeUserId) skip.push(employeeUserId);
      const adminIds = await adminHrIds(companyId, skip);

      await notifyBulk(adminIds, {
        companyId,
        type: "event_created",
        title: "New event",
        message: `${fullName(actingUser)} added the event "${event.title}"${when}.`,
        link: "/events",
        entityType: "Event",
        entityId: event._id,
      });
    } catch (err) {
      console.error("[event] notify failed:", err.message);
    }
  }

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
    let emp = null;
    if (employeeId) {
      emp = await employeeRepository.findById(employeeId);
      if (!emp || emp.companyId.toString() !== companyId.toString()) {
        throw Object.assign(
          new Error("employeeId must belong to the same company"),
          { statusCode: 400 },
        );
      }
    }

    const created = await eventRepository.create({
      companyId,
      type: data.type,
      title: data.title,
      employeeId,
      date: data.date,
      description: data.description?.trim() || null,
      isRecurringYearly: !!data.isRecurringYearly,
      createdBy: actingUser._id,
    });

    await this._notifyCreated(created, emp, actingUser);

    return created;
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
