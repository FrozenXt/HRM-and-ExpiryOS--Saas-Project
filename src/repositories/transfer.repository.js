const Transfer = require("../models/transfer.model");

const listPopulate = [
  {
    path: "employeeId",
    select: "userId id_int",
    populate: { path: "userId", select: "firstName lastName email" },
  },
  { path: "fromDepartmentId", select: "name" },
  { path: "toDepartmentId", select: "name" },
  { path: "fromDesignationId", select: "name" },
  { path: "toDesignationId", select: "name" },
];

const OPEN_STATUSES = ["pending", "approved"];

class TransferRepository {
  async findAll(searchHelper, scopeFilters = {}) {
    const filter = { ...searchHelper.getFilters(), ...scopeFilters };

    const [data, total] = await Promise.all([
      Transfer.find(filter)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit())
        .populate(listPopulate)
        .lean(),
      Transfer.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page: searchHelper.getPage(),
      limit: searchHelper.getLimit(),
    };
  }

  async findById(id) {
    return await Transfer.findById(id);
  }

  async create(data) {
    return await Transfer.create(data);
  }

  async update(id, data) {
    return await Transfer.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    );
  }

  async delete(id) {
    return await Transfer.findByIdAndDelete(id);
  }

  async findOpenByEmployeeId(employeeId) {
    return await Transfer.findOne({
      employeeId,
      status: { $in: OPEN_STATUSES },
    });
  }

  // Approved and the effective date has arrived.
  async findDueForApply(now = new Date()) {
    return await Transfer.find({
      status: "approved",
      effectiveDate: { $lte: now },
    });
  }
}

module.exports = new TransferRepository();
