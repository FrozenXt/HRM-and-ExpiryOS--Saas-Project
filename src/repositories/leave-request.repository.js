// repositories/leave-request.repository.js
const LeaveRequest = require("../models/leave-request.model");
const User = require("../models/user.model");
const { countDays } = require("../helpers/leave-balance.helper");

function withDetails(query) {
  return query
    .populate("leaveTypeId", "name annualQuota carryForward")
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
    });
}

const fullName = (u) =>
  u ? `${u.firstName} ${u.lastName || ""}`.trim() : null;

// Keeps every populated field and adds flat ones (name, photo, department,
// designation, leave type name, day count, approver) so the frontend needs
// no extra calls.
async function shape(docs) {
  const list = docs.map((d) =>
    typeof d.toObject === "function" ? d.toObject() : d,
  );

  const approverIds = [
    ...new Set(list.map((r) => r.approvedBy?.toString()).filter(Boolean)),
  ];
  const approvers = approverIds.length
    ? await User.find({ _id: { $in: approverIds } })
        .select("firstName lastName profileImage")
        .lean()
    : [];
  const approverMap = new Map(approvers.map((u) => [u._id.toString(), u]));

  return list.map((r) => {
    const emp =
      r.employeeId && typeof r.employeeId === "object" ? r.employeeId : null;
    const user =
      emp?.userId && typeof emp.userId === "object" ? emp.userId : null;
    const approver = approverMap.get(r.approvedBy?.toString());

    return {
      ...r,
      employeeName: fullName(user),
      profileImage: user?.profileImage ?? null,
      department: emp?.departmentId?.name ?? null,
      designation: emp?.designationId?.name ?? null,
      leaveTypeName: r.leaveTypeId?.name ?? null,
      days: r.fromDate && r.toDate ? countDays(r.fromDate, r.toDate) : null,
      approvedByName: fullName(approver),
      approvedByImage: approver?.profileImage ?? null,
    };
  });
}

class LeaveRequestRepository {
  async findAll(searchHelper, scopeFilter) {
    const filters = { ...searchHelper.getFilters(), ...scopeFilter };

    const [data, total] = await Promise.all([
      withDetails(
        LeaveRequest.find(filters)
          .sort(searchHelper.getSort())
          .skip(searchHelper.getSkip())
          .limit(searchHelper.getLimit()),
      ),
      LeaveRequest.countDocuments(filters),
    ]);

    return { data: await shape(data), total };
  }

  async findById(id, scopeFilter) {
    const doc = await withDetails(
      LeaveRequest.findOne({ _id: id, ...scopeFilter }),
    );
    if (!doc) return null;
    const [shaped] = await shape([doc]);
    return shaped;
  }

  async create(data) {
    return await LeaveRequest.create(data);
  }

  async update(id, scopeFilter, data) {
    return await LeaveRequest.findOneAndUpdate(
      { _id: id, ...scopeFilter },
      data,
      {
        new: true,
        runValidators: true,
      },
    );
  }

  async delete(id, scopeFilter) {
    return await LeaveRequest.findOneAndDelete({ _id: id, ...scopeFilter });
  }
}

module.exports = new LeaveRequestRepository();
