const Asset = require("../models/asset.model");

// Populates the asset's live status (currentAssignment) with the employee
// holding it, so one GET /assets/list call tells you both the asset's own
// fields AND who currently has it, if anyone — no second call needed.
function withDetails(query) {
  return query.populate({
    path: "currentAssignment",
    select: "employeeId assignedDate assignedBy",
    populate: [
      {
        path: "employeeId",
        select: "userId departmentId id_int",
        populate: [
          { path: "userId", select: "firstName lastName email" },
          { path: "departmentId", select: "name" },
        ],
      },
      { path: "assignedBy", select: "firstName lastName email" },
    ],
  });
}

class AssetRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      withDetails(
        Asset.find(filters)
          .sort(searchHelper.getSort())
          .skip(searchHelper.getSkip())
          .limit(searchHelper.getLimit()),
      ),
      Asset.countDocuments(filters),
    ]);
    return { data, total };
  }

  async findById(id, extraFilters = {}) {
    return await withDetails(Asset.findOne({ _id: id, ...extraFilters }));
  }

  async findByAssetTag(companyId, assetTag) {
    return await Asset.findOne({ companyId, assetTag });
  }

  async create(data) {
    return await Asset.create(data);
  }

  async update(id, data) {
    return await Asset.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id) {
    return await Asset.findByIdAndDelete(id);
  }
}

module.exports = new AssetRepository();
