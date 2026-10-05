const BaseTenantService = require("./base-tenant.service");
const TenantScope = require("../helpers/tenant-scope.helper");
const employeeRepository = require("../repositories/employee.repository");
const userRepository = require("../repositories/user.repository");
const departmentRepository = require("../repositories/department.repository");
const designationRepository = require("../repositories/designation.repository");
const PlanLimit = require("../helpers/plan-limit.helper");
const shiftRepository = require("../repositories/shift.repository");
const Employee = require("../models/employee.model");
const Attendance = require("../models/attendance.model");
const TimeLog = require("../models/time-log.model");
const LeaveBalance = require("../models/leave-balance.model");
const LeaveRequest = require("../models/leave-request.model");
const SalaryStructure = require("../models/salary-structure.model");
const Payroll = require("../models/payroll.model");
const CompanyDocument = require("../models/company-document.model");
const { attachProfileImage } = require("../helpers/profile-image.helper");
const { notify, notifyBulk, adminHrIds } = require("./notification.service");

const fullName = (u) =>
  u ? `${u.firstName} ${u.lastName || ""}`.trim() : "An employee";

class EmployeeService extends BaseTenantService {
  constructor() {
    super(employeeRepository, "Employee not found");
  }

  // Employee: in-app + email. Admin/HR: in-app. Never throws, so a
  // notification problem can't make the create/update fail.
  async _notifyDesignation(employee, designation, actingUser) {
    try {
      const companyId = employee.companyId?._id || employee.companyId;
      const employeeUser = await userRepository.findById(employee.userId);
      const name = fullName(employeeUser);
      const title = designation?.name
        ? `"${designation.name}"`
        : "a new designation";

      if (String(employee.userId) !== String(actingUser._id)) {
        await notify({
          userId: employee.userId,
          companyId,
          type: "designation_assigned",
          title: "New designation",
          message: `You have been assigned the designation ${title}.`,
          link: "/profile",
          entityType: "Employee",
          entityId: employee._id,
          email: { templateCode: "generic" },
        });
      }

      const adminIds = await adminHrIds(companyId, [
        actingUser._id,
        employee.userId,
      ]);
      await notifyBulk(adminIds, {
        companyId,
        type: "designation_assigned",
        title: "Designation assigned",
        message: `${fullName(actingUser)} assigned the designation ${title} to ${name}.`,
        link: "/employees",
        entityType: "Employee",
        entityId: employee._id,
      });
    } catch (err) {
      console.error("[employee] notify failed:", err.message);
    }
  }

  async _assertBelongsToCompany(repository, id, companyId, fieldLabel) {
    const doc = await repository.findById(id);

    if (!doc || doc.companyId.toString() !== companyId.toString()) {
      throw new Error(`${fieldLabel} must belong to the same company`);
    }

    return doc;
  }

  async create(data, actingUser) {
    const companyId = TenantScope.resolveCompanyId(actingUser, data.companyId);
    await PlanLimit.assertCanAddEmployee(companyId);

    const user = await userRepository.findById(data.userId);

    if (!user) {
      throw new Error("userId does not refer to an existing user");
    }

    if (!user.companyId || user.companyId.toString() !== companyId.toString()) {
      throw new Error("userId must belong to the same company");
    }

    const existingEmployee = await employeeRepository.findByUserId(data.userId);

    if (existingEmployee) {
      throw new Error("This user already has an employee profile");
    }

    await this._assertBelongsToCompany(
      departmentRepository,
      data.departmentId,
      companyId,
      "departmentId",
    );

    const designation = await this._assertBelongsToCompany(
      designationRepository,
      data.designationId,
      companyId,
      "designationId",
    );

    if (data.reportingManagerId) {
      await this._assertBelongsToCompany(
        employeeRepository,
        data.reportingManagerId,
        companyId,
        "reportingManagerId",
      );
    }

    const created = await employeeRepository.create({ ...data, companyId });

    await this._notifyDesignation(created, designation, actingUser);

    return created;
  }

  async update(id, data, actingUser) {
    const doc = await employeeRepository.findById(id);

    if (!doc) {
      throw new Error(this.notFoundMessage);
    }

    TenantScope.assertAccess(actingUser, doc, this.notFoundMessage);

    const { companyId, userId, ...safeData } = data;

    if (safeData.departmentId) {
      await this._assertBelongsToCompany(
        departmentRepository,
        safeData.departmentId,
        doc.companyId,
        "departmentId",
      );
    }

    let newDesignation = null;
    if (safeData.designationId) {
      newDesignation = await this._assertBelongsToCompany(
        designationRepository,
        safeData.designationId,
        doc.companyId,
        "designationId",
      );
    }
    if (safeData.shiftId) {
      await this._assertBelongsToCompany(
        shiftRepository,
        safeData.shiftId,
        doc.companyId,
        "shiftId",
      );
    }

    if (safeData.reportingManagerId) {
      if (safeData.reportingManagerId === id) {
        throw new Error("An employee cannot report to themselves");
      }

      await this._assertBelongsToCompany(
        employeeRepository,
        safeData.reportingManagerId,
        doc.companyId,
        "reportingManagerId",
      );
    }

    // Only notify when the designation actually changes.
    const oldDesignationId = String(
      doc.designationId?._id || doc.designationId || "",
    );
    const designationChanged =
      !!newDesignation && String(newDesignation._id) !== oldDesignationId;

    const updated = await employeeRepository.update(id, safeData);

    if (designationChanged) {
      await this._notifyDesignation(updated || doc, newDesignation, actingUser);
    }

    return updated;
  }

  // Lightweight list for dropdowns: active employees with name + department
  // filled in (the normal list only returns ids).
  async getOptions(actingUser) {
    const filter = { status: "active" };

    // admin/hr: own company only. super_admin: everything.
    if (actingUser.role !== "super_admin") {
      filter.companyId = actingUser.companyId;
    }

    const employees = await Employee.find(filter)
      .select("userId departmentId designationId id_int")
      .sort({ id_int: 1 })
      .lean();

    const unique = (key) => [
      ...new Set(
        employees.map((e) => e[key] && e[key].toString()).filter(Boolean),
      ),
    ];

    // Uses the repositories' findById, once per distinct id.
    const loadMap = async (repository, ids) => {
      const docs = await Promise.all(ids.map((id) => repository.findById(id)));
      return new Map(docs.filter(Boolean).map((d) => [d._id.toString(), d]));
    };

    const [users, departments, designations] = await Promise.all([
      loadMap(userRepository, unique("userId")),
      loadMap(departmentRepository, unique("departmentId")),
      loadMap(designationRepository, unique("designationId")),
    ]);

    return employees.map((e) => {
      const user = users.get(e.userId?.toString());
      const dept = departments.get(e.departmentId?.toString());
      const desig = designations.get(e.designationId?.toString());
      return {
        _id: e._id,
        id_int: e.id_int,
        userId: user
          ? {
              _id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            }
          : null,
        departmentId: dept ? { _id: dept._id, name: dept.name } : null,
        designationId: desig ? { _id: desig._id, name: desig.name } : null,
      };
    });
  }

  async getMyProfile(actingUser) {
    const employee = await employeeRepository.findByUserId(actingUser._id);
    const [withImage] = await attachProfileImage([employee]);
    return withImage;

    if (!employee) {
      throw new Error("No employee profile found for this account");
    }

    return employee;
  }

  _sumAttendanceHours(records) {
    let total = 0;
    for (const r of records) {
      if (!r.checkIn || !r.checkOut) continue;
      const worked = (new Date(r.checkOut) - new Date(r.checkIn)) / 3_600_000;
      if (worked > 0) total += worked;
    }
    return Math.round(total * 100) / 100;
  }

  _sumTimeLogHours(records) {
    let total = 0;
    for (const r of records) {
      total += (r.hoursWorked || 0) + (r.overtimeHours || 0);
    }
    return Math.round(total * 100) / 100;
  }

  async getById(id, actingUser) {
    const employee = await employeeRepository.findById(id);

    if (!employee) {
      throw new Error(this.notFoundMessage);
    }

    TenantScope.assertAccess(actingUser, employee, this.notFoundMessage);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const [
      user,
      department,
      designation,
      reportingManager,
      attendanceRecords,
      timeLogRecords,
      leaveBalances,
      recentLeaveRequests,
      salaryStructure,
      recentPayrolls,
      documents,
    ] = await Promise.all([
      userRepository.findById(employee.userId),
      departmentRepository.findById(employee.departmentId),
      designationRepository.findById(employee.designationId),
      employee.reportingManagerId
        ? employeeRepository.findById(employee.reportingManagerId)
        : Promise.resolve(null),

      Attendance.find({
        employeeId: employee._id,
        date: { $gte: monthStart, $lte: monthEnd },
      }).sort({ date: -1 }),

      TimeLog.find({
        employeeId: employee._id,
        date: { $gte: monthStart, $lte: monthEnd },
      }).sort({ date: -1 }),

      LeaveBalance.find({
        employeeId: employee._id,
        year: now.getFullYear(),
      }),

      LeaveRequest.find({ employeeId: employee._id })
        .sort({ createdAt: -1 })
        .limit(5),

      SalaryStructure.findOne({ employeeId: employee._id }),

      Payroll.find({ employeeId: employee._id }).sort({ period: -1 }).limit(5),

      CompanyDocument.find({ employeeId: employee._id })
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const approvedTimeLogs = timeLogRecords.filter(
      (t) => t.status === "approved",
    );

    return {
      ...employee.toObject(),
      profileImage: user?.profileImage ?? null,
      user,
      department,
      designation,
      reportingManager,

      attendance: {
        period: { from: monthStart, to: monthEnd },
        totalHours: this._sumAttendanceHours(attendanceRecords),
        records: attendanceRecords,
      },

      timeLogs: {
        period: { from: monthStart, to: monthEnd },
        totalApprovedHours: this._sumTimeLogHours(approvedTimeLogs),
        records: timeLogRecords,
      },

      leaveBalances: {
        year: now.getFullYear(),
        balances: leaveBalances,
      },

      recentLeaveRequests,

      salaryStructure,

      recentPayrolls,

      documents,
    };
  }
}

module.exports = new EmployeeService();
