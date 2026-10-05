const AssetAssignment = require("../models/asset-assignment.model");

const DAY = 24 * 60 * 60 * 1000;

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
        {
          path: "userId",
          select: "firstName lastName email profileImage",
        },
        { path: "departmentId", select: "name" },
        { path: "designationId", select: "name" },
      ],
    })
    .populate({
      path: "assignedBy",
      select: "firstName lastName email profileImage",
    })
    .populate({ path: "companyId", select: "legalName tradeName" });
}

const fullName = (u) =>
  u && typeof u === "object"
    ? `${u.firstName} ${u.lastName || ""}`.trim()
    : null;

function shape(docs) {
  return docs.map((doc) => {
    const r = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };

    const asset = r.assetId && typeof r.assetId === "object" ? r.assetId : null;
    const emp =
      r.employeeId && typeof r.employeeId === "object" ? r.employeeId : null;
    const user =
      emp?.userId && typeof emp.userId === "object" ? emp.userId : null;
    const assigner =
      r.assignedBy && typeof r.assignedBy === "object" ? r.assignedBy : null;
    const company =
      r.companyId && typeof r.companyId === "object" ? r.companyId : null;

    const end = r.returnedDate ? new Date(r.returnedDate) : new Date();
    const daysHeld = r.assignedDate
      ? Math.max(0, Math.floor((end - new Date(r.assignedDate)) / DAY))
      : null;

    return {
      ...r,

      // employee
      employeeName: fullName(user),
      profileImage: user?.profileImage ?? null,
      email: user?.email ?? null,
      employeeCode: emp?.id_int ?? null,
      department: emp?.departmentId?.name ?? null,
      designation: emp?.designationId?.name ?? null,

      // asset
      assetName: asset?.name ?? null,
      assetTag: asset?.assetTag ?? null,
      assetCategory: asset?.category ?? null,
      assetSerialNumber: asset?.serialNumber ?? null,
      assetStatus: asset?.status ?? null,

      // assigner
      assignedByName: fullName(assigner),
      assignedByImage: assigner?.profileImage ?? null,

      // company
      companyName: company?.legalName || company?.tradeName || null,

      // assignment state
      isReturned: !!r.returnedDate,
      daysHeld,
    };
  });
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
    return { data: shape(data), total };
  }

  async findById(id, extraFilters = {}) {
    const doc = await withDetails(
      AssetAssignment.findOne({ _id: id, ...extraFilters }),
    );
    if (!doc) return null;
    const [shaped] = shape([doc]);
    return shaped;
  }

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
