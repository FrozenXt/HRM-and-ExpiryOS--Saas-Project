const Resignation = require("../models/resignation.model");

// Lists show who the resignation belongs to; findById stays unpopulated so
// TenantScope.assertEmployeeAccess can compare plain ids.
const listPopulate = {
  path: "employeeId",
  select: "userId id_int",
  populate: { path: "userId", select: "firstName lastName email" },
};

const OPEN_STATUSES = ["pending", "approved"];

class ResignationRepository {
  async findAll(searchHelper, scopeFilters = {}) {
    // Scope goes last so a client filter can never override tenant/employee scope.
    const filter = { ...searchHelper.getFilters(), ...scopeFilters };

    const [data, total] = await Promise.all([
      Resignation.find(filter)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit())
        .populate(listPopulate)
        .lean(),
      Resignation.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page: searchHelper.getPage(),
      limit: searchHelper.getLimit(),
    };
  }

  async findById(id) {
    return await Resignation.findById(id);
  }

  async create(data) {
    return await Resignation.create(data);
  }

  async update(id, data) {
    return await Resignation.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    );
  }

  async delete(id) {
    return await Resignation.findByIdAndDelete(id);
  }

  // A pending or approved resignation that hasn't finished yet.
  async findOpenByEmployeeId(employeeId) {
    return await Resignation.findOne({
      employeeId,
      status: { $in: OPEN_STATUSES },
    });
  }

  // Approved and the last working day has passed.
  async findDueForCompletion(now = new Date()) {
    return await Resignation.find({
      status: "approved",
      lastWorkingDay: { $lte: now },
    });
  }
}

module.exports = new ResignationRepository();
