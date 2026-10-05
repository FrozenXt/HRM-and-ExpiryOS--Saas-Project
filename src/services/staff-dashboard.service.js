const Employee = require("../models/employee.model");
const Company = require("../models/company.model");
const CompanySettings = require("../models/company-settings.model");
const LeaveBalance = require("../models/leave-balance.model");
const LeaveRequest = require("../models/leave-request.model");
const Holiday = require("../models/holiday.model");
const Attendance = require("../models/attendance.model");
const Payroll = require("../models/payroll.model");
const Event = require("../models/event.model");

const UPCOMING_HOLIDAYS_LIMIT = 10;
const UPCOMING_BIRTHDAYS_WINDOW_DAYS = 30;
const UPCOMING_BIRTHDAYS_LIMIT = 10;
const PAYROLL_HISTORY_LIMIT = 12;
const USER_SELECT = "firstName lastName email profileImage";
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const pad = (n) => String(n).padStart(2, "0");

// Attendance rows are stored at the server's LOCAL midnight, so they are
// keyed with local getters.
const localKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
// Holidays, leave and events come from date inputs (UTC midnight), so they
// are keyed with UTC getters.
const utcKey = (d) => {
  const x = new Date(d);
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
};
const addDaysKey = (key, n) => {
  const [y, m, d] = key.split("-").map(Number);
  return utcKey(new Date(Date.UTC(y, m - 1, d + n)));
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function monthRange(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function durationHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  return (
    Math.round(((new Date(checkOut) - new Date(checkIn)) / 3_600_000) * 100) /
    100
  );
}

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || "09:00")
    .split(":")
    .map(Number);
  return (h || 0) * 60 + (m || 0);
};
const fromMinutes = (mins) =>
  `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;

// Minutes since midnight of `date`, as seen in the company's timezone.
function minutesOfDay(date, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(date));
    const h = Number(parts.find((p) => p.type === "hour").value);
    const m = Number(parts.find((p) => p.type === "minute").value);
    return h * 60 + m;
  } catch {
    const d = new Date(date);
    return d.getHours() * 60 + d.getMinutes();
  }
}

/**
 * Next occurrence of a (month, day) birthday on/after `from`, within
 * `windowDays`. Returns null if it doesn't fall in that window.
 */
function nextBirthdayWithin(dateOfBirth, from, windowDays) {
  const dob = new Date(dateOfBirth);
  const month = dob.getMonth();
  const day = dob.getDate();

  let next = new Date(from.getFullYear(), month, day);
  if (next < from) next = new Date(from.getFullYear() + 1, month, day);

  const diffDays = Math.round((next - from) / 86_400_000);
  return diffDays <= windowDays ? next : null;
}

// A holiday is one row per date, so a multi-day holiday is consecutive dates
// with the same name. They are grouped into one range here.
function groupHolidays(holidays) {
  const groups = [];
  for (const h of holidays) {
    const key = utcKey(h.date);
    const last = groups[groups.length - 1];
    const sameName =
      last && last.name.toLowerCase() === String(h.name).toLowerCase();
    if (sameName && last.end === key) continue; // duplicate row
    if (sameName && addDaysKey(last.end, 1) === key) {
      last.end = key;
      last.days += 1;
    } else {
      groups.push({ name: h.name, start: key, end: key, days: 1 });
    }
  }
  const byKey = new Map();
  for (const g of groups) {
    for (let i = 0; i < g.days; i++) byKey.set(addDaysKey(g.start, i), g);
  }
  return { groups, byKey };
}

// Birthdays, anniversaries, seminars and company events, keyed by day.
// Birthdays come from each employee's date of birth, so stored "birthday"
// events are skipped to avoid showing them twice.
function buildEventMap({ year, month, events, employees }) {
  const map = new Map();
  const add = (key, ev) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(ev);
  };
  const monthStart = `${year}-${pad(month)}-01`;
  const monthEnd = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;

  for (const e of employees) {
    if (!e.dateOfBirth) continue;
    const dob = new Date(e.dateOfBirth);
    if (dob.getUTCMonth() + 1 !== month) continue;
    const u = e.userId;
    const name = u ? `${u.firstName} ${u.lastName || ""}`.trim() : "-";
    add(`${year}-${pad(month)}-${pad(dob.getUTCDate())}`, {
      kind: "birthday",
      title: `${name}'s birthday`,
      name,
      profileImage: u?.profileImage || null,
    });
  }

  for (const ev of events) {
    if (ev.type === "birthday") continue;
    const d = new Date(ev.date);
    let key;
    if (ev.isRecurringYearly) {
      if (d.getUTCMonth() + 1 !== month) continue;
      key = `${year}-${pad(month)}-${pad(d.getUTCDate())}`;
    } else {
      key = utcKey(d);
      if (key < monthStart || key > monthEnd) continue;
    }
    add(key, {
      kind: ev.type || "other",
      title: ev.title,
      description: ev.description || null,
    });
  }
  return map;
}

class StaffDashboardService {
  /**
   * Figures out whose dashboard is being requested:
   * - staff: always their own, requestedEmployeeId is ignored entirely.
   * - admin/hr: their own profile if no requestedEmployeeId is given,
   *   otherwise any employee in their own company.
   * - super_admin: their own profile (if any) if no requestedEmployeeId,
   *   otherwise any employee in any company.
   */
  async _resolveEmployee(user, requestedEmployeeId) {
    if (user.role === "staff") {
      const employee = await Employee.findOne({ userId: user._id }).populate(
        "userId",
        USER_SELECT,
      );
      if (!employee) {
        const err = new Error("No employee profile linked to this user");
        err.statusCode = 404;
        throw err;
      }
      return employee;
    }

    if (!requestedEmployeeId) {
      const own = await Employee.findOne({ userId: user._id }).populate(
        "userId",
        USER_SELECT,
      );
      if (own) return own;
      const err = new Error(
        "employeeId query param is required (this account has no employee profile of its own)",
      );
      err.statusCode = 400;
      throw err;
    }

    const employee = await Employee.findById(requestedEmployeeId).populate(
      "userId",
      USER_SELECT,
    );
    if (!employee) {
      const err = new Error("Employee not found");
      err.statusCode = 404;
      throw err;
    }
    if (
      user.role !== "super_admin" &&
      String(employee.companyId) !== String(user.companyId)
    ) {
      const err = new Error("That employee is not in your company");
      err.statusCode = 403;
      throw err;
    }
    return employee;
  }

  // One entry per day of the month, using the company settings:
  // late = check-in after startTime + grace, complete = worked >= fullDayMinHours.
  // Week-off days come from settings.weekOff, so every company can differ.
  _buildCalendar({
    year,
    month,
    today,
    employee,
    settings,
    attendance,
    holidayByKey,
    leaves,
    eventsByKey,
  }) {
    const wh = settings?.workingHours || {};
    const policy = settings?.attendancePolicy || {};
    const weekOff = settings?.weekOff || ["sat", "sun"];
    const tz = wh.timezone || "Asia/Kathmandu";
    const startMin = toMinutes(wh.startTime || "09:00");
    const grace = policy.lateMarkGraceMinutes ?? 15;
    const fullMin = policy.fullDayMinHours ?? 8;
    const halfMin = policy.halfDayMinHours ?? 4;
    const autoAbsent = policy.autoMarkAbsentIfNoCheckIn ?? true;

    const todayKey = localKey(today);
    const joinKey = employee.joiningDate
      ? localKey(employee.joiningDate)
      : null;
    const monthStartKey = `${year}-${pad(month)}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthEndKey = `${year}-${pad(month)}-${pad(daysInMonth)}`;

    const attByKey = new Map(attendance.map((a) => [localKey(a.date), a]));

    // Approved leave, expanded to one entry per day inside this month.
    const leaveByKey = new Map();
    for (const lr of leaves) {
      let k = utcKey(lr.fromDate);
      const end = utcKey(lr.toDate);
      for (let guard = 0; k <= end && guard < 400; guard++) {
        if (k >= monthStartKey && k <= monthEndKey) {
          leaveByKey.set(k, {
            type: lr.leaveTypeId?.name || "Leave",
            from: lr.fromDate,
            to: lr.toDate,
          });
        }
        k = addDaysKey(k, 1);
      }
    }

    const summary = {
      workingDays: 0,
      complete: 0,
      late: 0,
      halfDay: 0,
      incomplete: 0,
      absent: 0,
      holidays: 0,
      weekOffs: 0,
      leaveDays: 0,
      totalWorkedHours: 0,
    };

    const calendar = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${pad(month)}-${pad(d)}`;
      const weekday = WEEKDAYS[new Date(year, month - 1, d).getDay()];
      const rec = attByKey.get(key);
      const hol = holidayByKey.get(key);
      const lv = leaveByKey.get(key);
      const isWeekOff = weekOff.includes(weekday);
      const isToday = key === todayKey;
      const isFuture = key > todayKey;
      const beforeJoining = joinKey && key < joinKey;

      let workedHours = null;
      let isLate = false;
      let lateByMinutes = 0;
      let isComplete = false;
      let isHalf = false;
      let isShort = false;
      let missingCheckout = false;

      if (rec?.checkIn) {
        const inMin = minutesOfDay(rec.checkIn, tz);
        isLate = inMin > startMin + grace || rec.status === "late";
        lateByMinutes = isLate ? Math.max(0, inMin - startMin) : 0;
        workedHours = durationHours(rec.checkIn, rec.checkOut);
        if (rec.checkOut) {
          if (workedHours >= fullMin) isComplete = true;
          else if (workedHours >= halfMin) isHalf = true;
          else isShort = true;
        } else {
          missingCheckout = !isToday;
        }
      }

      let display;
      if (rec) {
        if (rec.checkIn) {
          if (missingCheckout || isShort) display = "incomplete";
          else if (isLate) display = "late";
          else if (isHalf || rec.status === "half_day") display = "half_day";
          else if (isComplete) display = "complete";
          else display = "working"; // checked in today, not out yet
        } else {
          display =
            rec.status === "absent"
              ? "absent"
              : rec.status === "half_day"
                ? "half_day"
                : rec.status === "late"
                  ? "late"
                  : "complete";
        }
      } else if (beforeJoining) display = "before_joining";
      else if (hol) display = "holiday";
      else if (isWeekOff) display = "weekoff";
      else if (lv) display = "leave";
      else if (isFuture) display = "upcoming";
      else if (isToday) display = "today_pending";
      else display = autoAbsent ? "absent" : "no_record";

      // --- month summary ---
      const isWorkingDay = !hol && !isWeekOff && !lv && !beforeJoining;
      if (hol) summary.holidays += 1;
      if (isWeekOff) summary.weekOffs += 1;
      if (lv) summary.leaveDays += 1;
      if (isWorkingDay && !isFuture) summary.workingDays += 1;
      if (display === "complete") summary.complete += 1;
      if (display === "late") summary.late += 1;
      else if (isLate) summary.late += 1;
      if (display === "half_day") summary.halfDay += 1;
      if (display === "incomplete") summary.incomplete += 1;
      if (display === "absent") summary.absent += 1;
      if (workedHours) summary.totalWorkedHours += workedHours;

      calendar.push({
        date: rec?.date || new Date(year, month - 1, d),
        dateKey: key,
        day: d,
        weekday,
        isToday,
        dayType: hol
          ? "holiday"
          : isWeekOff
            ? "weekoff"
            : lv
              ? "leave"
              : "working",
        display,
        status: rec?.status || null,
        checkIn: rec?.checkIn || null,
        checkOut: rec?.checkOut || null,
        durationHours: workedHours,
        requiredHours: fullMin,
        isLate,
        lateByMinutes,
        isComplete,
        autoCheckedOut: rec?.autoCheckedOut || false,
        isWithinGeofence: rec?.isWithinGeofence ?? null,
        holiday: hol
          ? { name: hol.name, start: hol.start, end: hol.end, days: hol.days }
          : null,
        leave: lv || null,
        events: eventsByKey.get(key) || [],
      });
    }

    summary.totalWorkedHours = Math.round(summary.totalWorkedHours * 100) / 100;

    return {
      calendar,
      calendarSummary: summary,
      policy: {
        startTime: wh.startTime || "09:00",
        endTime: wh.endTime || "18:00",
        timezone: tz,
        lateAfter: fromMinutes(startMin + grace),
        graceMinutes: grace,
        fullDayMinHours: fullMin,
        halfDayMinHours: halfMin,
        weekOff,
      },
      monthStartKey,
      monthEndKey,
    };
  }

  async getDashboard(user, { employeeId, month, year } = {}) {
    const employee = await this._resolveEmployee(user, employeeId);
    const today = startOfDay();
    const targetYear = Number(year) || today.getFullYear();
    const targetMonth = Number(month) || today.getMonth() + 1; // 1-12
    const { start: monthStart, end: monthEnd } = monthRange(
      targetYear,
      targetMonth,
    );
    // Wide window so a holiday range that crosses a month edge is still grouped.
    const holidayFrom = new Date(monthStart.getTime() - 20 * 86_400_000);
    const holidayTo = new Date(monthEnd.getTime() + 20 * 86_400_000);

    const [
      company,
      settings,
      leaveBalances,
      upcomingHolidays,
      monthHolidays,
      approvedLeaves,
      companyEmployeesForBirthdays,
      attendanceForMonth,
      payrollHistory,
      monthEvents,
    ] = await Promise.all([
      Company.findById(employee.companyId).select(
        "legalName tradeName logoUrl",
      ),

      CompanySettings.findOne({ companyId: employee.companyId }).lean(),

      LeaveBalance.find({
        employeeId: employee._id,
        year: targetYear,
      }).populate("leaveTypeId", "name annualQuota carryForward"),

      Holiday.find({ companyId: employee.companyId, date: { $gte: today } })
        .sort({ date: 1 })
        .limit(UPCOMING_HOLIDAYS_LIMIT)
        .select("name date"),

      Holiday.find({
        companyId: employee.companyId,
        date: { $gte: holidayFrom, $lte: holidayTo },
      })
        .sort({ date: 1 })
        .select("name date")
        .lean(),

      LeaveRequest.find({
        employeeId: employee._id,
        status: "approved",
        fromDate: { $lte: holidayTo },
        toDate: { $gte: monthStart },
      })
        .populate("leaveTypeId", "name")
        .lean(),

      Employee.find({
        companyId: employee.companyId,
        dateOfBirth: { $ne: null },
      })
        .populate("userId", "firstName lastName profileImage")
        .select("userId dateOfBirth"),

      Attendance.find({
        employeeId: employee._id,
        date: { $gte: monthStart, $lte: monthEnd },
      }).sort({ date: 1 }),

      Payroll.find({ employeeId: employee._id })
        .sort({ period: -1 })
        .limit(PAYROLL_HISTORY_LIMIT)
        .populate("currencyId", "code symbol"),

      Event.find({
        companyId: employee.companyId,
        $or: [
          { isRecurringYearly: true },
          { date: { $gte: holidayFrom, $lte: holidayTo } },
        ],
      })
        .select("type title date description isRecurringYearly")
        .lean(),
    ]);

    // --- Leave -------------------------------------------------------------
    const leave = {
      year: targetYear,
      balances: leaveBalances.map((b) => ({
        leaveTypeId: b.leaveTypeId?._id || b.leaveTypeId,
        leaveTypeName: b.leaveTypeId?.name || "-",
        annualQuota: b.leaveTypeId?.annualQuota ?? null,
        used: b.used,
        remaining: b.remaining,
        total: (b.used || 0) + (b.remaining || 0),
      })),
    };
    leave.totals = leave.balances.reduce(
      (acc, b) => ({
        used: acc.used + b.used,
        remaining: acc.remaining + b.remaining,
        total: acc.total + b.total,
      }),
      { used: 0, remaining: 0, total: 0 },
    );

    // --- Upcoming birthdays (whole company, not just this employee) --------
    const upcomingBirthdays = companyEmployeesForBirthdays
      .map((e) => {
        const next = nextBirthdayWithin(
          e.dateOfBirth,
          today,
          UPCOMING_BIRTHDAYS_WINDOW_DAYS,
        );
        if (!next) return null;
        const u = e.userId;
        return {
          employeeId: e._id,
          name: u ? `${u.firstName} ${u.lastName || ""}`.trim() : "-",
          profileImage: u?.profileImage || null,
          date: next,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.date - b.date)
      .slice(0, UPCOMING_BIRTHDAYS_LIMIT);

    // --- Attendance summary (records only) ---------------------------------
    const attendanceSummary = {
      present: 0,
      late: 0,
      half_day: 0,
      absent: 0,
      totalDays: 0,
    };
    for (const a of attendanceForMonth) {
      attendanceSummary.totalDays += 1;
      if (attendanceSummary[a.status] !== undefined)
        attendanceSummary[a.status] += 1;
    }

    // --- Full-month calendar: settings, holidays, leave and events ---------
    const { groups, byKey: holidayByKey } = groupHolidays(monthHolidays);
    const eventsByKey = buildEventMap({
      year: targetYear,
      month: targetMonth,
      events: monthEvents,
      employees: companyEmployeesForBirthdays,
    });
    const built = this._buildCalendar({
      year: targetYear,
      month: targetMonth,
      today,
      employee,
      settings,
      attendance: attendanceForMonth,
      holidayByKey,
      leaves: approvedLeaves,
      eventsByKey,
    });

    const holidaysInMonth = groups.filter(
      (g) => g.end >= built.monthStartKey && g.start <= built.monthEndKey,
    );

    // --- Payroll -------------------------------------------------------------
    const payroll = payrollHistory.map((p) => ({
      id: p._id,
      period: p.period,
      status: p.status,
      wageType: p.wageType,
      payableDays: p.payableDays,
      regularHours: p.regularHours,
      overtimeHours: p.overtimeHours,
      grossPay: p.grossPay,
      overtimePay: p.overtimePay,
      deductions: p.deductions,
      netPay: p.netPay,
      currencyCode: p.currencyId?.code || null,
      currencySymbol: p.currencyId?.symbol || null,
    }));

    const u = employee.userId;

    return {
      employee: {
        id: employee._id,
        name: u ? `${u.firstName} ${u.lastName || ""}`.trim() : "-",
        email: u?.email || employee.personalEmail || null,
        profileImage: u?.profileImage || null,
        joiningDate: employee.joiningDate,
        status: employee.status,
      },
      company: company
        ? {
            id: company._id,
            name: company.legalName,
            tradeName: company.tradeName,
            logoUrl: company.logoUrl,
          }
        : null,
      leave,
      upcomingHolidays: upcomingHolidays.map((h) => ({
        name: h.name,
        date: h.date,
      })),
      upcomingBirthdays,
      attendance: {
        month: targetMonth,
        year: targetYear,
        summary: attendanceSummary,
        calendarSummary: built.calendarSummary,
        policy: built.policy,
        holidays: holidaysInMonth,
        calendar: built.calendar,
      },
      payroll,
    };
  }
}

module.exports = new StaffDashboardService();
