/**
 * Shared CRUD implementation for simple tenant-scoped collections
 * (Department, Designation, LeaveType, DocumentType, Holiday, ...).
 * Model-specific repositories extend this and add only what's unique
 * to them (e.g. a lookup used for a uniqueness check).
 */
class BaseTenantRepository {
  constructor(Model) {
    this.Model = Model;
  }

  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };

    const [data, total] = await Promise.all([
      this.Model.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),

      this.Model.countDocuments(filters),
    ]);

    return {
      data,
      total,
    };
  }

  async findById(id) {
    return await this.Model.findById(id);
  }

  // Used by BaseTenantService for per-company uniqueness checks
  // (e.g. no two Departments in the same company named the same thing).
  async findByField(companyId, field, value, excludeId = null) {
    const query = { companyId, [field]: value };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    return await this.Model.findOne(query);
  }

  async create(data) {
    return await this.Model.create(data);
  }

  async update(id, data) {
    return await this.Model.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id) {
    return await this.Model.findByIdAndDelete(id);
  }
}

module.exports = BaseTenantRepository;
