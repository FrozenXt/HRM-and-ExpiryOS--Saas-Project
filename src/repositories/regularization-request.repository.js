const RegularizationRequest = require("../models/regularization-request.model");
const Attendance = require("../models/attendance.model");
const User = require("../models/user.model");
const { attachEmployeeInfo } = require("../helpers/employee-info.helper");

const uid = (v) => (v && v._id ? v._id : v)?.toString();
const fullName = (u) =>
  u ? `${u.firstName} ${u.lastName || ""}`.trim() : null;

class RegularizationRequestRepository {
  // Adds employee name/photo/department, requester/approver names and the
  // linked attendance details to each request. Existing fields are untouched.
  async enrich(records) {
    const list = await attachEmployeeInfo(records);

    const attendanceIds = [
      ...new Set(list.map((r) => uid(r.attendanceId)).filter(Boolean)),
    ];
    const userIds = [
      ...new Set(
        list
          .flatMap((r) => [uid(r.requestedBy), uid(r.approvedBy)])
          .filter(Boolean),
      ),
    ];

    const [attendances, users] = await Promise.all([
      attendanceIds.length
        ? Attendance.find({ _id: { $in: attendanceIds } })
            .select("date checkIn checkOut status")
            .lean()
        : [],
      userIds.length
        ? User.find({ _id: { $in: userIds } })
            .select("firstName lastName email profileImage")
            .lean()
        : [],
    ]);

    const attMap = new Map(attendances.map((a) => [uid(a._id), a]));
    const userMap = new Map(users.map((u) => [uid(u._id), u]));

    return list.map((r) => {
      const att = attMap.get(uid(r.attendanceId));
      const requester = userMap.get(uid(r.requestedBy));
      const approver = userMap.get(uid(r.approvedBy));
      return {
        ...r,
        requestedByName: fullName(requester),
        requestedByImage: requester?.profileImage ?? null,
        approvedByName: fullName(approver),
        approvedByImage: approver?.profileImage ?? null,
        attendance: att
          ? {
              _id: att._id,
              date: att.date,
              checkIn: att.checkIn,
              checkOut: att.checkOut,
              status: att.status,
            }
          : null,
      };
    });
  }

  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };
    const [data, total] = await Promise.all([
      RegularizationRequest.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),
      RegularizationRequest.countDocuments(filters),
    ]);
    return { data: await this.enrich(data), total };
  }

  async findById(id) {
    return await RegularizationRequest.findById(id);
  }

  async create(data) {
    return await RegularizationRequest.create(data);
  }

  async update(id, data) {
    return await RegularizationRequest.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }
}

module.exports = new RegularizationRequestRepository();
