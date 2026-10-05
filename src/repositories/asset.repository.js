const Asset = require("../models/asset.model");

const DAY = 24 * 60 * 60 * 1000;

// Populates the asset's live status (currentAssignment) with the employee
// holding it, including their photo, so one list call tells you both the
// asset's own fields AND who currently has it, if anyone.
function withDetails(query) {
  return query.populate({
    path: "currentAssignment",
    select: "employeeId assignedDate assignedBy",
    populate: [
      {
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
      },
      {
        path: "assignedBy",
        select: "firstName lastName email profileImage",
      },
    ],
  });
}

const fullName = (u) =>
  u && typeof u === "object"
    ? `${u.firstName} ${u.lastName || ""}`.trim()
    : null;

// Keeps every existing field (including the nested currentAssignment) and
// adds flat holder / assigner fields.
function shape(docs) {
  return docs.map((doc) => {
    // virtuals: true keeps the populated currentAssignment virtual.
    const r =
      typeof doc.toObject === "function"
        ? doc.toObject({ virtuals: true })
        : { ...doc };

    const a =
      r.currentAssignment && typeof r.currentAssignment === "object"
        ? r.currentAssignment
        : null;
    const emp =
      a?.employeeId && typeof a.employeeId === "object" ? a.employeeId : null;
    const user =
      emp?.userId && typeof emp.userId === "object" ? emp.userId : null;
    const assigner =
      a?.assignedBy && typeof a.assignedBy === "object" ? a.assignedBy : null;

    return {
      ...r,

      isAssigned: !!a,

      // current holder
      holderName: fullName(user),
      holderImage: user?.profileImage ?? null,
      holderEmail: user?.email ?? null,
      holderCode: emp?.id_int ?? null,
      holderDepartment: emp?.departmentId?.name ?? null,
      holderDesignation: emp?.designationId?.name ?? null,

      // assignment details
      assignedDate: a?.assignedDate ?? null,
      assignedByName: fullName(assigner),
      assignedByImage: assigner?.profileImage ?? null,
      daysHeld: a?.assignedDate
        ? Math.max(0, Math.floor((Date.now() - new Date(a.assignedDate)) / DAY))
        : null,
    };
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
    return { data: shape(data), total };
  }

  async findById(id, extraFilters = {}) {
    const doc = await withDetails(Asset.findOne({ _id: id, ...extraFilters }));
    if (!doc) return null;
    const [shaped] = shape([doc]);
    return shaped;
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
