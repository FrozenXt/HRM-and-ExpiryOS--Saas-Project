const mongoose = require("mongoose");
const Employee = require("../models/employee.model");
const Company = require("../models/company.model");
const Department = require("../models/department.model");
const Attendance = require("../models/attendance.model");
const LeaveRequest = require("../models/leave-request.model");
const Payroll = require("../models/payroll.model");
const Plan = require("../models/plan.model");
const CompanyDocument = require("../models/company-document.model");
const User = require("../models/user.model");

// Hiring schemas were never shared — load defensively so a wrong guess about
// their shape degrades the hiring section to null instead of crashing the
// whole dashboard.
function tryRequire(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}
const JobPosting = tryRequire("../models/job-posting.model");
const Candidate = tryRequire("../models/candidate.model");

const UPCOMING_BIRTHDAYS_WINDOW_DAYS = 30;
const UPCOMING_BIRTHDAYS_LIMIT = 10;

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function currentPeriod(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function fullName(u) {
  return u ? `${u.firstName} ${u.lastName || ""}`.trim() : "-";
}
function nextBirthdayWithin(dateOfBirth, from, windowDays) {
  const dob = new Date(dateOfBirth);
  let next = new Date(from.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < from)
    next = new Date(from.getFullYear() + 1, dob.getMonth(), dob.getDate());
  const diffDays = Math.round((next - from) / 86_400_000);
  return diffDays <= windowDays ? next : null;
}
// Hours between two times, 2 decimals. null if either is missing.
function hoursBetween(a, b) {
  if (!a || !b) return null;
  const h = (new Date(b) - new Date(a)) / 3_600_000;
  return h > 0 ? Math.round(h * 100) / 100 : 0;
}
const pct = (part, whole) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0;

const EMPLOYEE_POPULATE = [
  { path: "userId", select: "firstName lastName email profileImage" },
  { path: "departmentId", select: "name" },
  { path: "designationId", select: "name title" },
];

class AdminDashboardService {
  // admin/hr are locked to their own company; super_admin may pass a
  // companyId for a company-level view, or omit it for a platform-wide one.
  _resolveCompanyId(user, requestedCompanyId) {
    if (user.role === "super_admin") return requestedCompanyId || null;
    return user.companyId;
  }

  async getDashboard(user, { companyId } = {}) {
    const scopeCompanyId = this._resolveCompanyId(user, companyId);
    return scopeCompanyId
      ? await this._companyDashboard(scopeCompanyId)
      : await this._platformDashboard();
  }

  // --- Super admin, no company selected: top-line numbers across every company ---
  // --- Super admin, no company selected: platform-wide overview ---
  async _platformDashboard() {
    const DAY = 86_400_000;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      companies,
      plans,
      empCounts,
      newEmployeesThisMonth,
      pendingDocuments,
      totalUsers,
    ] = await Promise.all([
      Company.find()
        .select(
          "legalName tradeName logoUrl planId employeeLimit subscriptionStatus subscriptionStartDate subscriptionEndDate verificationStatus isActive country createdAt",
        )
        .lean(),
      Plan.find().select("name employeeLimit monthlyPrice").lean(),
      Employee.aggregate([
        {
          $group: {
            _id: "$companyId",
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          },
        },
      ]),
      Employee.countDocuments({ createdAt: { $gte: monthStart } }),
      CompanyDocument.countDocuments({ status: "pending_review" }),
      User.countDocuments({ status: "active", role: { $ne: "super_admin" } }),
    ]);

    const planById = new Map(plans.map((p) => [String(p._id), p]));
    const empById = new Map(empCounts.map((e) => [String(e._id), e]));

    // One compact row per company, reused by every list below.
    const rows = companies.map((c) => {
      const plan = planById.get(String(c.planId));
      const emp = empById.get(String(c._id));
      const limit = c.employeeLimit ?? plan?.employeeLimit ?? null;
      const employees = emp?.total || 0;
      const end = c.subscriptionEndDate
        ? new Date(c.subscriptionEndDate)
        : null;
      return {
        id: c._id,
        name: c.tradeName || c.legalName,
        legalName: c.legalName,
        logo: c.logoUrl || null,
        country: c.country || null,
        plan: plan?.name || "-",
        planPrice: plan?.monthlyPrice || 0,
        status: c.subscriptionStatus,
        isActive: !!c.isActive,
        verificationStatus: c.verificationStatus,
        startDate: c.subscriptionStartDate || null,
        endDate: end,
        daysLeft: end ? Math.ceil((end - now) / DAY) : null,
        employees,
        employeeLimit: limit,
        usagePct: limit ? Math.round((employees / limit) * 100) : null,
        createdAt: c.createdAt,
      };
    });

    // ---- Revenue (estimated from plan prices; there is no payments table) ----
    const paying = rows.filter((r) => r.status === "active");
    const mrr = paying.reduce((n, r) => n + r.planPrice, 0);

    const revenueByPlan = plans
      .map((p) => {
        const onPlan = rows.filter((r) => r.plan === p.name);
        const payingOnPlan = onPlan.filter((r) => r.status === "active");
        return {
          plan: p.name,
          price: p.monthlyPrice || 0,
          companies: onPlan.length,
          payingCompanies: payingOnPlan.length,
          mrr: payingOnPlan.length * (p.monthlyPrice || 0),
        };
      })
      .sort((a, b) => b.mrr - a.mrr);

    // ---- Growth: last 6 months ----
    const growth = [];
    for (let i = 5; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const joined = rows.filter(
        (r) => new Date(r.createdAt) >= from && new Date(r.createdAt) < to,
      );
      growth.push({
        month: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`,
        label: from.toLocaleString("en-US", { month: "short" }),
        newCompanies: joined.length,
        newMrr: joined
          .filter((r) => r.status === "active")
          .reduce((n, r) => n + r.planPrice, 0),
      });
    }

    // ---- Lists ----
    const open = rows.filter((r) => r.status !== "cancelled");
    const expiringSoon = open
      .filter((r) => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 60)
      .sort((a, b) => a.daysLeft - b.daysLeft);
    const expired = open.filter((r) => r.daysLeft !== null && r.daysLeft < 0);
    const needsAttention = rows
      .filter(
        (r) =>
          r.status === "past_due" ||
          r.status === "suspended" ||
          (r.daysLeft !== null && r.daysLeft < 0 && r.status !== "cancelled"),
      )
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
    const nearLimit = rows
      .filter((r) => r.usagePct !== null && r.usagePct >= 90)
      .sort((a, b) => b.usagePct - a.usagePct);
    const pendingVerification = rows
      .filter((r) => r.verificationStatus === "pending")
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const statusCount = (s) => rows.filter((r) => r.status === s).length;
    const sinceMonth = (r) => new Date(r.createdAt) >= monthStart;
    const LIST = 10;

    return {
      scope: "platform",
      totals: {
        totalCompanies: rows.length,
        activeCompanies: rows.filter((r) => r.isActive).length,
        totalEmployees: empCounts.reduce((n, e) => n + e.total, 0),
        totalUsers,
        newCompaniesThisMonth: rows.filter(sinceMonth).length,
        newEmployeesThisMonth,
        trialCompanies: statusCount("trial"),
        payingCompanies: paying.length,
        pastDueCompanies: statusCount("past_due"),
        suspendedCompanies: statusCount("suspended"),
        expiringSoonCount: expiringSoon.length,
        expiredCount: expired.length,
        pendingVerificationCount: pendingVerification.length,
        pendingDocuments,
      },
      revenue: {
        note: "Estimated from plan prices of companies with an active subscription.",
        mrr,
        arr: mrr * 12,
        averagePerCompany: paying.length ? Math.round(mrr / paying.length) : 0,
        byPlan: revenueByPlan,
      },
      growth,
      subscriptionBreakdown: [
        "trial",
        "active",
        "past_due",
        "suspended",
        "cancelled",
      ]
        .map((status) => ({ status, count: statusCount(status) }))
        .filter((s) => s.count > 0),
      expiringSoon: expiringSoon.slice(0, LIST),
      needsAttention: needsAttention.slice(0, LIST),
      nearLimit: nearLimit.slice(0, LIST),
      pendingVerification: pendingVerification.slice(0, LIST),
      topCompanies: [...rows]
        .sort((a, b) => b.employees - a.employees)
        .slice(0, 5),
      recentCompanies: [...rows]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5),
    };
  }

  // --- Full company-level dashboard ------------------------------------------
  async _companyDashboard(rawCompanyId) {
    // Aggregations don't cast ids, so a string companyId (for example from a
    // super admin's query string) would silently match nothing.
    const companyId = new mongoose.Types.ObjectId(String(rawCompanyId));

    const today = startOfDay();
    const todayEnd = endOfDay();
    const period = currentPeriod();

    const [
      company,
      departments,
      employees,
      todaysAttendance,
      onLeaveToday,
      pendingLeaveCount,
      payrollAgg,
      draftPayrollCount,
    ] = await Promise.all([
      Company.findById(companyId)
        .select(
          "legalName tradeName logo logoUrl subscriptionStatus subscriptionStartDate subscriptionEndDate planId",
        )
        .populate("planId", "name")
        .lean(),

      Department.find({ companyId }).select("name").lean(),

      Employee.find({ companyId }).populate(EMPLOYEE_POPULATE),

      Attendance.find({ companyId, date: { $gte: today, $lte: todayEnd } }),

      LeaveRequest.find({
        companyId,
        status: "approved",
        fromDate: { $lte: todayEnd },
        toDate: { $gte: today },
      })
        .populate({ path: "employeeId", populate: EMPLOYEE_POPULATE })
        .populate("leaveTypeId", "name"),

      LeaveRequest.countDocuments({ companyId, status: "pending" }),

      Payroll.aggregate([
        { $match: { companyId, period } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalNetPay: { $sum: "$netPay" },
            totalGrossPay: { $sum: "$grossPay" },
          },
        },
      ]),

      Payroll.countDocuments({ companyId, status: "draft" }),
    ]);

    // --- Employees -----------------------------------------------------------
    const employeesById = new Map(employees.map((e) => [String(e._id), e]));
    const employeeView = (e) => ({
      employeeId: e._id,
      employeeCode: e.id_int ?? null,
      name: fullName(e.userId),
      email: e.userId?.email || null,
      profileImage: e.userId?.profileImage || null,
      departmentId: e.departmentId?._id || null,
      department: e.departmentId?.name || "-",
      designation: e.designationId?.name || e.designationId?.title || "-",
      status: e.status,
    });

    // --- Today's attendance ---------------------------------------------------
    const attendanceByEmployee = new Map(
      todaysAttendance.map((a) => [String(a.employeeId), a]),
    );
    const attendanceRow = (emp, a) => ({
      ...employeeView(emp),
      attendanceId: a._id,
      attendanceStatus: a.status,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      workedHours: hoursBetween(a.checkIn, a.checkOut),
      stillWorking: !!a.checkIn && !a.checkOut,
      autoCheckedOut: !!a.autoCheckedOut,
      isWithinGeofence: a.isWithinGeofence ?? null,
    });

    const presentList = [];
    const lateList = [];
    const halfDayList = [];
    for (const a of todaysAttendance) {
      const emp = employeesById.get(String(a.employeeId));
      if (!emp) continue;
      const row = attendanceRow(emp, a);
      if (a.status === "present") presentList.push(row);
      else if (a.status === "late") lateList.push(row);
      else if (a.status === "half_day") halfDayList.push(row);
    }
    const byCheckIn = (x, y) =>
      new Date(x.checkIn || 0) - new Date(y.checkIn || 0);
    presentList.sort(byCheckIn);
    lateList.sort(byCheckIn);
    halfDayList.sort(byCheckIn);

    // --- On leave today --------------------------------------------------------
    const onLeaveEmployeeIds = new Set(
      onLeaveToday.map((lr) => String(lr.employeeId?._id || lr.employeeId)),
    );
    const onLeaveList = onLeaveToday.map((lr) => {
      const emp = lr.employeeId;
      return {
        ...(emp ? employeeView(emp) : {}),
        leaveType: lr.leaveTypeId?.name || "-",
        fromDate: lr.fromDate,
        toDate: lr.toDate,
      };
    });

    // --- Today's status for EVERY employee ------------------------------------
    // present | late | half_day | on_leave | absent | inactive
    const statusOf = (e) => {
      const a = attendanceByEmployee.get(String(e._id));
      if (a && a.checkIn) return a.status === "absent" ? "present" : a.status;
      if (onLeaveEmployeeIds.has(String(e._id))) return "on_leave";
      if (e.status !== "active") return "inactive";
      return "absent";
    };

    const absentList = employees
      .filter((e) => statusOf(e) === "absent")
      .map(employeeView);

    // --- Departments: people, counts and today's status ------------------------
    const deptMap = new Map();
    const newDept = (id, name) => ({
      departmentId: id,
      name,
      totalEmployees: 0,
      activeEmployees: 0,
      presentCount: 0,
      lateCount: 0,
      halfDayCount: 0,
      onLeaveCount: 0,
      absentCount: 0,
      attendanceRate: 0,
      members: [],
    });
    for (const d of departments)
      deptMap.set(String(d._id), newDept(d._id, d.name));

    for (const e of employees) {
      const key = e.departmentId ? String(e.departmentId._id) : "unassigned";
      if (!deptMap.has(key)) {
        deptMap.set(
          key,
          newDept(
            e.departmentId?._id || null,
            e.departmentId?.name || "Unassigned",
          ),
        );
      }
      const dept = deptMap.get(key);
      const todayStatus = statusOf(e);
      const a = attendanceByEmployee.get(String(e._id));

      dept.totalEmployees += 1;
      if (e.status === "active") dept.activeEmployees += 1;
      if (todayStatus === "present") dept.presentCount += 1;
      if (todayStatus === "late") dept.lateCount += 1;
      if (todayStatus === "half_day") dept.halfDayCount += 1;
      if (todayStatus === "on_leave") dept.onLeaveCount += 1;
      if (todayStatus === "absent") dept.absentCount += 1;

      dept.members.push({
        ...employeeView(e),
        todayStatus,
        checkIn: a?.checkIn || null,
        checkOut: a?.checkOut || null,
        workedHours: a ? hoursBetween(a.checkIn, a.checkOut) : null,
        stillWorking: !!a?.checkIn && !a?.checkOut,
      });
    }

    const departmentsSummary = [...deptMap.values()]
      .map((d) => {
        const attended = d.presentCount + d.lateCount + d.halfDayCount;
        d.attendanceRate = pct(attended, d.activeEmployees);
        d.members.sort((x, y) => x.name.localeCompare(y.name));
        return d;
      })
      .sort((a, b) => b.totalEmployees - a.totalEmployees);

    // --- Subscription ------------------------------------------------------
    let daysRemaining = null;
    if (company?.subscriptionEndDate) {
      daysRemaining = Math.ceil(
        (new Date(company.subscriptionEndDate) - today) / 86_400_000,
      );
    }

    // --- Payroll (current period) -------------------------------------------
    const payrollByStatus = Object.fromEntries(
      payrollAgg.map((p) => [
        p._id,
        {
          count: p.count,
          totalNetPay: p.totalNetPay,
          totalGrossPay: p.totalGrossPay,
        },
      ]),
    );
    const emptyPayroll = { count: 0, totalNetPay: 0, totalGrossPay: 0 };

    // --- Upcoming birthdays (whole company) ---------------------------------
    const upcomingBirthdays = employees
      .filter((e) => e.dateOfBirth)
      .map((e) => {
        const next = nextBirthdayWithin(
          e.dateOfBirth,
          today,
          UPCOMING_BIRTHDAYS_WINDOW_DAYS,
        );
        return next ? { ...employeeView(e), date: next } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.date - b.date)
      .slice(0, UPCOMING_BIRTHDAYS_LIMIT);

    // --- Hiring (best-effort — schemas unseen) ------------------------------
    let hiring = null;
    if (JobPosting) {
      try {
        const [openPostings, totalPostings] = await Promise.all([
          JobPosting.countDocuments({ companyId, status: "open" }),
          JobPosting.countDocuments({ companyId }),
        ]);
        let totalCandidates = null;
        if (Candidate) {
          const postingIds = (
            await JobPosting.find({ companyId }).select("_id")
          ).map((p) => p._id);
          totalCandidates = await Candidate.countDocuments({
            jobPostingId: { $in: postingIds },
          });
        }
        hiring = { openPostings, totalPostings, totalCandidates };
      } catch (err) {
        hiring = {
          error:
            "Hiring data unavailable — schema assumption didn't match: " +
            err.message,
        };
      }
    }

    // --- Attendance totals -----------------------------------------------------
    const activeEmployees = employees.filter(
      (e) => e.status === "active",
    ).length;
    const attendedCount =
      presentList.length + lateList.length + halfDayList.length;
    const checkIns = [...presentList, ...lateList, ...halfDayList]
      .map((r) => r.checkIn)
      .filter(Boolean)
      .map((d) => new Date(d));

    return {
      scope: "company",
      company: company
        ? {
            id: company._id,
            name: company.legalName,
            tradeName: company.tradeName,
            logo: company.logoUrl || company.logo || null,
            plan: company.planId?.name || null,
          }
        : null,

      employees: {
        total: employees.length,
        active: activeEmployees,
        inactive: employees.length - activeEmployees,
        byDepartment: departmentsSummary.map((d) => ({
          department: d.name,
          count: d.totalEmployees,
        })),
        list: employees.map(employeeView),
      },

      departments: {
        total: departmentsSummary.length,
        list: departmentsSummary,
      },

      attendanceToday: {
        date: today,
        totalEmployees: employees.length,
        activeEmployees,
        presentCount: attendedCount,
        attendanceRate: pct(attendedCount, activeEmployees),
        firstCheckIn: checkIns.length ? new Date(Math.min(...checkIns)) : null,
        lastCheckIn: checkIns.length ? new Date(Math.max(...checkIns)) : null,
        stillWorkingCount: [...presentList, ...lateList, ...halfDayList].filter(
          (r) => r.stillWorking,
        ).length,
        presentList,
        lateCount: lateList.length,
        lateList,
        halfDayCount: halfDayList.length,
        halfDayList,
        onLeaveCount: onLeaveList.length,
        onLeaveList,
        absentCount: absentList.length,
        absentList,
      },

      subscription: company
        ? {
            status: company.subscriptionStatus,
            startDate: company.subscriptionStartDate,
            endDate: company.subscriptionEndDate,
            daysRemaining,
          }
        : null,

      payroll: {
        period,
        draft: payrollByStatus.draft || emptyPayroll,
        approved: payrollByStatus.approved || emptyPayroll,
        released: payrollByStatus.released || emptyPayroll,
      },

      upcomingBirthdays,
      hiring,

      pendingApprovals: {
        leaveRequests: pendingLeaveCount,
        draftPayrolls: draftPayrollCount,
      },
    };
  }
}

module.exports = new AdminDashboardService();
