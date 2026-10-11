const ExcelJS = require("exceljs");
const Company = require("../models/company.model");
const CompanySettings = require("../models/company-settings.model");
const Department = require("../models/department.model");
const Designation = require("../models/designation.model");
const Attendance = require("../models/attendance.model");
const LeaveRequest = require("../models/leave-request.model");
const Holiday = require("../models/holiday.model");
// Reused so the report follows exactly the same rules as the staff calendar.
const staffDashboardService = require("./staff-dashboard.service");

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad = (n) => String(n).padStart(2, "0");
const utcKey = (d) => {
  const x = new Date(d);
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
};
const fail = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
};
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "-");
const round2 = (n) => Math.round(n * 100) / 100;

// fill = cell background, font = text colour (ARGB).
const STYLE = {
  complete: {
    label: "Full day",
    code: "P",
    fill: "FFC6EFCE",
    font: "FF006100",
  },
  late: { label: "Late", code: "L", fill: "FFFFEB9C", font: "FF9C5700" },
  half_day: {
    label: "Half day",
    code: "H",
    fill: "FFE4DFEC",
    font: "FF5B2C83",
  },
  incomplete: {
    label: "Incomplete",
    code: "I",
    fill: "FFFFC7CE",
    font: "FF9C0006",
  },
  absent: { label: "Absent", code: "A", fill: "FFFF9999", font: "FF7F0000" },
  holiday: { label: "Holiday", code: "HD", fill: "FFB7E4DD", font: "FF0B5345" },
  leave: { label: "On leave", code: "LV", fill: "FFBDD7EE", font: "FF1F4E78" },
  weekoff: {
    label: "Week off",
    code: "WO",
    fill: "FFD9D9D9",
    font: "FF595959",
  },
  working: { label: "Working", code: "W", fill: "FFE2EFDA", font: "FF375623" },
  today_pending: {
    label: "Not in yet",
    code: "-",
    fill: "FFF2F2F2",
    font: "FF7F7F7F",
  },
  no_record: {
    label: "No record",
    code: "?",
    fill: "FFF2F2F2",
    font: "FF7F7F7F",
  },
};
const SKIP_IN_DAILY = new Set(["upcoming", "before_joining", "none"]);
const LEGEND_KEYS = [
  "complete",
  "late",
  "half_day",
  "incomplete",
  "absent",
  "leave",
  "holiday",
  "weekoff",
];

const NAVY = "FF1F3A5F";
const thin = { style: "thin", color: { argb: "FFD0D5DD" } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
const solid = (argb) => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb },
});

function styleHeader(row) {
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    c.fill = solid(NAVY);
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.border = BORDER;
  });
  row.height = 22;
}

function paint(cell, st, bold = false) {
  cell.fill = solid(st.fill);
  cell.font = { color: { argb: st.font }, bold };
}

function timeText(date, timeZone) {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(date));
  } catch {
    return new Date(date).toTimeString().slice(0, 5);
  }
}

class AttendanceReportService {
  // month omitted -> the whole year.
  async build(user, { employeeId, year, month } = {}) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const y = Number(year) || todayStart.getFullYear();
    const m = month ? Number(month) : null;
    if (!Number.isInteger(y) || y < 2000 || y > 2100) fail("Invalid year");
    if (m !== null && (!Number.isInteger(m) || m < 1 || m > 12))
      fail("Invalid month");

    // Staff always get their own. Admin/HR can pass employeeId for anyone
    // in their company. Same rules as the staff dashboard.
    const employee = await staffDashboardService._resolveEmployee(
      user,
      employeeId,
    );

    const rangeStart = new Date(y, m ? m - 1 : 0, 1);
    const rangeEnd = m
      ? new Date(y, m, 0, 23, 59, 59, 999)
      : new Date(y, 11, 31, 23, 59, 59, 999);
    const edgeFrom = new Date(rangeStart.getTime() - 86_400_000);
    const edgeTo = new Date(rangeEnd.getTime() + 86_400_000);

    const [
      company,
      settings,
      department,
      designation,
      attendance,
      holidays,
      leaves,
    ] = await Promise.all([
      Company.findById(employee.companyId).select("legalName tradeName").lean(),
      CompanySettings.findOne({ companyId: employee.companyId }).lean(),
      Department.findById(employee.departmentId).select("name").lean(),
      Designation.findById(employee.designationId).select("name title").lean(),
      Attendance.find({
        employeeId: employee._id,
        date: { $gte: rangeStart, $lte: rangeEnd },
      }).sort({ date: 1 }),
      Holiday.find({
        companyId: employee.companyId,
        date: { $gte: edgeFrom, $lte: edgeTo },
      })
        .select("name date")
        .lean(),
      LeaveRequest.find({
        employeeId: employee._id,
        status: "approved",
        fromDate: { $lte: edgeTo },
        toDate: { $gte: edgeFrom },
      })
        .populate("leaveTypeId", "name")
        .lean(),
    ]);

    const holidayByKey = new Map();
    for (const h of holidays) {
      const k = utcKey(h.date);
      holidayByKey.set(k, { name: h.name, start: k, end: k, days: 1 });
    }

    const monthList = m ? [m] : Array.from({ length: 12 }, (_, i) => i + 1);
    const results = monthList.map((mo) => ({
      month: mo,
      ...staffDashboardService._buildCalendar({
        year: y,
        month: mo,
        today: todayStart,
        employee,
        settings,
        attendance,
        holidayByKey,
        leaves,
        eventsByKey: new Map(),
      }),
    }));
    const policy = results[0].policy;

    // ---- Totals ----
    const totals = {
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
      attended: 0,
    };
    const leaveByType = new Map();
    for (const r of results) {
      for (const k of Object.keys(totals)) {
        if (k !== "attended") totals[k] += r.calendarSummary[k] || 0;
      }
      for (const e of r.calendar) {
        if (e.checkIn) totals.attended += 1;
        if (e.display === "leave" && e.leave) {
          leaveByType.set(
            e.leave.type,
            (leaveByType.get(e.leave.type) || 0) + 1,
          );
        }
      }
    }
    totals.totalWorkedHours = round2(totals.totalWorkedHours);
    const avgHours = totals.attended
      ? round2(totals.totalWorkedHours / totals.attended)
      : 0;
    const rate = totals.workingDays
      ? Math.min(
          100,
          Math.round((totals.attended / totals.workingDays) * 1000) / 10,
        )
      : 0;

    const name = fullName(employee.userId);
    const periodLabel = m ? `${MONTH_NAMES[m - 1]} ${y}` : `Year ${y}`;
    const companyName = company?.tradeName || company?.legalName || "";

    const wb = new ExcelJS.Workbook();
    wb.creator = companyName || "HRMS";
    wb.created = new Date();

    this._summarySheet(wb, {
      name,
      employee,
      department,
      designation,
      companyName,
      periodLabel,
      policy,
      totals,
      avgHours,
      rate,
      leaveByType,
      results,
      y,
    });
    this._dailySheet(wb, results, policy.timezone);
    this._gridSheet(wb, results, y);

    const slug =
      name
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "employee";
    const filename = `attendance-${m ? `${y}-${pad(m)}` : y}-${slug}.xlsx`;

    return { buffer: await wb.xlsx.writeBuffer(), filename };
  }

  /* ---------------- Summary ---------------- */
  _summarySheet(wb, d) {
    const ws = wb.addWorksheet("Summary", {
      views: [{ showGridLines: false }],
    });
    ws.columns = [
      { width: 30 },
      { width: 18 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
    ];

    ws.mergeCells("A1:I1");
    const title = ws.getCell("A1");
    title.value = "Attendance Report";
    title.font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
    title.fill = solid(NAVY);
    title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(1).height = 34;

    const info = [
      ["Employee", d.name],
      ["Employee ID", d.employee.id_int ?? "-"],
      ["Department", d.department?.name || "-"],
      ["Designation", d.designation?.name || d.designation?.title || "-"],
      ["Company", d.companyName || "-"],
      ["Period", d.periodLabel],
      ["Work hours", `${d.policy.startTime} – ${d.policy.endTime}`],
      ["Late after", d.policy.lateAfter],
      [
        "Full day / half day",
        `${d.policy.fullDayMinHours}h / ${d.policy.halfDayMinHours}h`,
      ],
      [
        "Week off",
        d.policy.weekOff.length ? d.policy.weekOff.join(", ") : "none",
      ],
      ["Generated on", new Date().toLocaleString("en-GB")],
    ];
    let r = 3;
    for (const [label, value] of info) {
      ws.getCell(`A${r}`).value = label;
      ws.getCell(`A${r}`).font = { bold: true, color: { argb: "FF475467" } };
      ws.getCell(`B${r}`).value = value;
      ws.getCell(`B${r}`).alignment = { horizontal: "left" };
      r += 1;
    }

    // ---- Key numbers ----
    r += 1;
    ws.getCell(`A${r}`).value = "Metric";
    ws.getCell(`B${r}`).value = "Value";
    styleHeader(ws.getRow(r));
    r += 1;
    const metrics = [
      ["Working days (up to today)", d.totals.workingDays, null],
      ["Full days", d.totals.complete, "complete"],
      ["Late arrivals", d.totals.late, "late"],
      ["Half days", d.totals.halfDay, "half_day"],
      ["Incomplete days", d.totals.incomplete, "incomplete"],
      ["Absent days", d.totals.absent, "absent"],
      ["Leave days", d.totals.leaveDays, "leave"],
      ["Holidays", d.totals.holidays, "holiday"],
      ["Week offs", d.totals.weekOffs, "weekoff"],
      ["Total hours worked", d.totals.totalWorkedHours, null],
      ["Average hours per attended day", d.avgHours, null],
      ["Attendance rate", `${d.rate}%`, null],
    ];
    for (const [label, value, key] of metrics) {
      const a = ws.getCell(`A${r}`);
      const b = ws.getCell(`B${r}`);
      a.value = label;
      b.value = value;
      b.alignment = { horizontal: "center" };
      b.font = { bold: true };
      if (key) paint(a, STYLE[key], true);
      a.border = BORDER;
      b.border = BORDER;
      r += 1;
    }

    // ---- Leave by type ----
    r += 1;
    ws.getCell(`A${r}`).value = "Leave type";
    ws.getCell(`B${r}`).value = "Days";
    styleHeader(ws.getRow(r));
    r += 1;
    if (d.leaveByType.size === 0) {
      ws.getCell(`A${r}`).value = "No leave taken";
      ws.getCell(`A${r}`).font = { italic: true, color: { argb: "FF7F7F7F" } };
      r += 1;
    } else {
      for (const [type, days] of d.leaveByType) {
        paint(ws.getCell(`A${r}`), STYLE.leave);
        ws.getCell(`A${r}`).value = type;
        ws.getCell(`B${r}`).value = days;
        ws.getCell(`B${r}`).alignment = { horizontal: "center" };
        ws.getCell(`A${r}`).border = BORDER;
        ws.getCell(`B${r}`).border = BORDER;
        r += 1;
      }
    }

    // ---- Month by month (yearly report only) ----
    if (d.results.length > 1) {
      r += 1;
      const head = [
        "Month",
        "Working",
        "Full",
        "Late",
        "Half",
        "Incomplete",
        "Absent",
        "Leave",
        "Hours",
      ];
      head.forEach((h, i) => (ws.getCell(r, i + 1).value = h));
      styleHeader(ws.getRow(r));
      r += 1;
      for (const res of d.results) {
        const s = res.calendarSummary;
        const vals = [
          MONTH_NAMES[res.month - 1],
          s.workingDays,
          s.complete,
          s.late,
          s.halfDay,
          s.incomplete,
          s.absent,
          s.leaveDays,
          round2(s.totalWorkedHours),
        ];
        vals.forEach((v, i) => {
          const c = ws.getCell(r, i + 1);
          c.value = v;
          c.border = BORDER;
          if (i > 0) c.alignment = { horizontal: "center" };
        });
        r += 1;
      }
    }

    // ---- Legend ----
    r += 1;
    ws.getCell(`A${r}`).value = "Colour legend";
    styleHeader(ws.getRow(r));
    ws.mergeCells(`A${r}:B${r}`);
    r += 1;
    for (const key of LEGEND_KEYS) {
      const a = ws.getCell(`A${r}`);
      a.value = STYLE[key].label;
      paint(a, STYLE[key], true);
      a.border = BORDER;
      ws.getCell(`B${r}`).value = STYLE[key].code;
      ws.getCell(`B${r}`).alignment = { horizontal: "center" };
      ws.getCell(`B${r}`).border = BORDER;
      r += 1;
    }
  }

  /* ---------------- Daily records ---------------- */
  _dailySheet(wb, results, timeZone) {
    const ws = wb.addWorksheet("Daily Records", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Day", key: "day", width: 7 },
      { header: "Status", key: "status", width: 14 },
      { header: "Check In", key: "in", width: 11 },
      { header: "Check Out", key: "out", width: 11 },
      { header: "Hours Worked", key: "hours", width: 13 },
      { header: "Required Hours", key: "req", width: 14 },
      { header: "Late By (min)", key: "late", width: 13 },
      { header: "Holiday / Leave", key: "note", width: 24 },
      { header: "Remarks", key: "remarks", width: 28 },
    ];
    styleHeader(ws.getRow(1));

    let lateMinutes = 0;
    let hours = 0;

    for (const res of results) {
      for (const e of res.calendar) {
        if (SKIP_IN_DAILY.has(e.display)) continue;
        const st = STYLE[e.display] || STYLE.no_record;
        const [yy, mm, dd] = e.dateKey.split("-").map(Number);

        const remarks = [];
        if (e.display === "incomplete") {
          remarks.push(e.checkOut ? "Short hours" : "Missing check-out");
        }
        if (e.autoCheckedOut) remarks.push("Auto check-out");
        if (e.isWithinGeofence === false) remarks.push("Outside work zone");

        const late = e.isLate && e.lateByMinutes ? e.lateByMinutes : null;
        if (late) lateMinutes += late;
        if (e.durationHours) hours += e.durationHours;

        const row = ws.addRow({
          date: new Date(Date.UTC(yy, mm - 1, dd)),
          day: e.weekday[0].toUpperCase() + e.weekday.slice(1),
          status: st.label,
          in: timeText(e.checkIn, timeZone),
          out: timeText(e.checkOut, timeZone),
          hours: e.durationHours ?? null,
          req: e.checkIn ? e.requiredHours : null,
          late,
          note: e.holiday?.name || e.leave?.type || "",
          remarks: remarks.join(" · "),
        });

        row.eachCell({ includeEmpty: true }, (c, col) => {
          c.fill = solid(st.fill);
          c.font = { color: { argb: st.font }, bold: col === 3 };
          c.border = BORDER;
          if (col >= 2 && col <= 8) c.alignment = { horizontal: "center" };
        });
        row.getCell("date").numFmt = "dd mmm yyyy";
        row.getCell("date").alignment = { horizontal: "left" };
        row.getCell("hours").numFmt = "0.00";
        row.getCell("req").numFmt = "0.00";
      }
    }

    const last = ws.rowCount;
    if (last > 1) {
      const total = ws.addRow({ date: "Total" });
      total.getCell("hours").value = {
        formula: `SUM(F2:F${last})`,
        result: round2(hours),
      };
      total.getCell("late").value = {
        formula: `SUM(H2:H${last})`,
        result: lateMinutes,
      };
      total.getCell("hours").numFmt = "0.00";
      total.eachCell({ includeEmpty: true }, (c, col) => {
        c.font = { bold: true };
        c.fill = solid("FFE7ECF3");
        c.border = {
          top: { style: "medium", color: { argb: NAVY } },
          bottom: thin,
          left: thin,
          right: thin,
        };
        if (col >= 2 && col <= 8) c.alignment = { horizontal: "center" };
      });
      ws.autoFilter = { from: "A1", to: "J1" };
    }
  }

  /* ---------------- Calendar grid ---------------- */
  _gridSheet(wb, results, year) {
    const ws = wb.addWorksheet("Calendar Grid", {
      views: [{ state: "frozen", xSplit: 1, ySplit: 1 }],
    });

    const head = ["Month"];
    for (let d = 1; d <= 31; d++) head.push(d);
    head.push("Full", "Late", "Half", "Incomplete", "Absent", "Leave", "Hours");
    ws.addRow(head);
    styleHeader(ws.getRow(1));

    ws.getColumn(1).width = 14;
    for (let c = 2; c <= 32; c++) ws.getColumn(c).width = 4.6;
    for (let c = 33; c <= 39; c++) ws.getColumn(c).width = 11;

    for (const res of results) {
      const daysInMonth = new Date(year, res.month, 0).getDate();
      const s = res.calendarSummary;
      const row = ws.addRow([
        MONTH_NAMES[res.month - 1],
        ...Array(31).fill(""),
        s.complete,
        s.late,
        s.halfDay,
        s.incomplete,
        s.absent,
        s.leaveDays,
        round2(s.totalWorkedHours),
      ]);
      row.height = 22;

      row.getCell(1).font = { bold: true };
      row.getCell(1).border = BORDER;

      for (let d = 1; d <= 31; d++) {
        const cell = row.getCell(d + 1);
        cell.border = BORDER;
        cell.alignment = { horizontal: "center", vertical: "middle" };
        if (d > daysInMonth) {
          cell.fill = solid("FFBFBFBF");
          continue;
        }
        const e = res.calendar[d - 1];
        const st = e && !SKIP_IN_DAILY.has(e.display) ? STYLE[e.display] : null;
        if (st) {
          cell.value = st.code;
          paint(cell, st, true);
          cell.font = { ...cell.font, size: 9 };
        }
      }
      for (let c = 33; c <= 39; c++) {
        row.getCell(c).alignment = { horizontal: "center" };
        row.getCell(c).border = BORDER;
      }
      row.getCell(39).numFmt = "0.00";
    }

    const legendRow = ws.rowCount + 2;
    ws.getCell(legendRow, 1).value = "Legend";
    ws.getCell(legendRow, 1).font = { bold: true };
    LEGEND_KEYS.forEach((key, i) => {
      const cell = ws.getCell(legendRow + 1 + i, 1);
      cell.value = `${STYLE[key].code}  ${STYLE[key].label}`;
      paint(cell, STYLE[key], true);
      cell.border = BORDER;
    });
  }
}

module.exports = new AttendanceReportService();
