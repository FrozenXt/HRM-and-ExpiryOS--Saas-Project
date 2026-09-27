const BaseTenantService = require("./base-tenant.service");
const TenantScope = require("../helpers/tenant-scope.helper");
const employeeRepository = require("../repositories/employee.repository");
const userRepository = require("../repositories/user.repository");
const departmentRepository = require("../repositories/department.repository");
const designationRepository = require("../repositories/designation.repository");
const PlanLimit = require("../helpers/plan-limit.helper");

// Related-data models pulled in for the enriched employee detail response.
// Path convention matches your other models — double check these against
// your actual model files if any of these requires don't resolve.
const Attendance = require("../models/attendance.model");
const TimeLog = require("../models/time-log.model");
const LeaveBalance = require("../models/leave-balance.model");
const LeaveRequest = require("../models/leave-request.model");
const SalaryStructure = require("../models/salary-structure.model");
const Payroll = require("../models/payroll.model");
const CompanyDocument = require("../models/company-document.model");

class EmployeeService extends BaseTenantService {
  constructor() {
    super(employeeRepository, "Employee not found");
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

    await this._assertBelongsToCompany(
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

    return await employeeRepository.create({ ...data, companyId });
  }

  async update(id, data, actingUser) {
    const doc = await employeeRepository.findById(id);

    if (!doc) {
      throw new Error(this.notFoundMessage);
    }

    TenantScope.assertAccess(actingUser, doc, this.notFoundMessage);

    // userId and companyId are fixed at creation — an Employee profile
    // doesn't get reassigned to a different User or Company via update.
    const { companyId, userId, ...safeData } = data;

    if (safeData.departmentId) {
      await this._assertBelongsToCompany(
        departmentRepository,
        safeData.departmentId,
        doc.companyId,
        "departmentId",
      );
    }

    if (safeData.designationId) {
      await this._assertBelongsToCompany(
        designationRepository,
        safeData.designationId,
        doc.companyId,
        "designationId",
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

    return await employeeRepository.update(id, safeData);
  }

  async getMyProfile(actingUser) {
    const employee = await employeeRepository.findByUserId(actingUser._id);

    if (!employee) {
      throw new Error("No employee profile found for this account");
    }

    return employee;
  }

  // --- Enriched detail response for GET /employees/:id ---------------------

  // Sums checkIn/checkOut gaps from a list of Attendance records into total
  // hours. Mirrors the same calculation used in attendance.service.js /
  // payrollCalculations.js on the frontend, so the numbers here should agree
  // with what those already show.
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

      // This month's attendance.
      Attendance.find({
        employeeId: employee._id,
        date: { $gte: monthStart, $lte: monthEnd },
      }).sort({ date: -1 }),

      // This month's time logs (all statuses — the totals below only sum
      // approved ones, but the raw list shows drafts/submitted too).
      TimeLog.find({
        employeeId: employee._id,
        date: { $gte: monthStart, $lte: monthEnd },
      }).sort({ date: -1 }),

      // This year's leave balances, all leave types.
      LeaveBalance.find({
        employeeId: employee._id,
        year: now.getFullYear(),
      }),

      // Last 5 leave requests, most recent first.
      LeaveRequest.find({ employeeId: employee._id })
        .sort({ createdAt: -1 })
        .limit(5),

      // One active salary structure per employee (schema-enforced).
      SalaryStructure.findOne({ employeeId: employee._id }),

      // Last 5 payroll records, most recent period first.
      Payroll.find({ employeeId: employee._id }).sort({ period: -1 }).limit(5),

      // Last 5 documents for this employee.
      CompanyDocument.find({ employeeId: employee._id })
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const approvedTimeLogs = timeLogRecords.filter(
      (t) => t.status === "approved",
    );

    return {
      ...employee.toObject(),

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
