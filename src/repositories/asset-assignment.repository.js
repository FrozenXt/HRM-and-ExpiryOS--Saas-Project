const AssetAssignment = require("../models/asset-assignment.model");

// Full join: the asset's own details, the employee's name/department, who
// assigned it, and the company — everything a list screen needs in one hit.
function withDetails(query) {
  return query
    .populate({
      path: "assetId",
      select:
        "assetTag name category serialNumber status purchaseDate purchaseCost id_int",
    })
    .populate({
      path: "employeeId",
      select: "userId departmentId designationId id_int",
      populate: [
        { path: "userId", select: "firstName lastName email" },
        { path: "departmentId", select: "name" },
        { path: "designationId", select: "name" },
      ],
    })
    .populate({ path: "assignedBy", select: "firstName lastName email" })
    .populate({ path: "companyId", select: "legalName tradeName" });
}

class AssetAssignmentRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      withDetails(
        AssetAssignment.find(filters)
          .sort(searchHelper.getSort())
          .skip(searchHelper.getSkip())
          .limit(searchHelper.getLimit()),
      ),
      AssetAssignment.countDocuments(filters),
    ]);
    return { data, total };
  }

  async findById(id, extraFilters = {}) {
    return await withDetails(
      AssetAssignment.findOne({ _id: id, ...extraFilters }),
    );
  }

  // The asset's currently-active assignment (no returnedDate yet), used to
  // enforce "one active holder per asset" and to auto-mark the asset
  // available again on return.
  async findActiveByAssetId(assetId) {
    return await AssetAssignment.findOne({ assetId, returnedDate: null });
  }

  async create(data) {
    return await AssetAssignment.create(data);
  }

  async update(id, data) {
    return await AssetAssignment.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id) {
    return await AssetAssignment.findByIdAndDelete(id);
  }
}

module.exports = new AssetAssignmentRepository();
