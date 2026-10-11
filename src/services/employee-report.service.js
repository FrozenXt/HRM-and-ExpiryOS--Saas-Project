const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const Employee = require("../models/employee.model");
const Attendance = require("../models/attendance.model");
const Company = require("../models/company.model");
const CompanySettings = require("../models/company-settings.model");
const Department = require("../models/department.model");
const Designation = require("../models/designation.model");

const pad = (n) => String(n).padStart(2, "0");
const fail = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
};
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "-");
const round2 = (n) => Math.round(n * 100) / 100;
const pct = (part, whole) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0;
const utcKey = (d) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const LABELS = {
  gender: {
    male: "Male",
    female: "Female",
    other: "Other",
    prefer_not_to_say: "Prefer not to say",
    none: "Not specified",
  },
  employmentType: {
    full_time: "Full time",
    part_time: "Part time",
    contract: "Contract",
    intern: "Intern",
    none: "Not specified",
  },
  probation: {
    on_probation: "On probation",
    confirmed: "Confirmed",
    not_set: "Not set",
  },
  status: { active: "Active", inactive: "Inactive" },
};

const TENURE_BUCKETS = [
  { key: "lt6", label: "Under 6 months", max: 6 },
  { key: "6to12", label: "6 – 12 months", max: 12 },
  { key: "1to2", label: "1 – 2 years", max: 24 },
  { key: "2to5", label: "2 – 5 years", max: 60 },
  { key: "5plus", label: "5+ years", max: Infinity },
];

// Joining / exit dates come from date inputs (UTC midnight).
function tenureMonths(from, to) {
  let m =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) m -= 1;
  return Math.max(0, m);
}
const tenureText = (m) => `${Math.floor(m / 12)}y ${m % 12}m`;

function probationStatus(e, todayUtc) {
  if (e.confirmationDate) return "confirmed";
  if (e.probationEndDate) {
    return new Date(e.probationEndDate) >= todayUtc
      ? "on_probation"
      : "confirmed";
  }
  return "not_set";
}

function countBy(list, keyFn, labelFn) {
  const map = new Map();
  for (const item of list) {
    const k = keyFn(item);
    map.set(k, (map.get(k) || 0) + 1);
  }
  const total = list.length;
  return [...map.entries()]
    .map(([key, count]) => ({
      key,
      label: labelFn ? labelFn(key) : key,
      count,
      percent: pct(count, total),
    }))
    .sort((a, b) => b.count - a.count);
}

class EmployeeReportService {
  _companyId(user, requested) {
    const id = user.role === "super_admin" ? requested : user.companyId;
    if (!id) fail("companyId is required");
    return id;
  }

  // Period + filters. The period drives new joiners, leavers and worked hours;
  // every other filter narrows the employees themselves.
  _filters(q = {}) {
    const today = new Date();
    const parse = (s) => {
      if (!s) return null;
      const [y, m, d] = String(s).split("-").map(Number);
      return y && m && d ? { y, m, d } : null;
    };
    const a = parse(q.to) || {
      y: today.getFullYear(),
      m: today.getMonth() + 1,
      d: today.getDate(),
    };
    const defaultFrom = new Date(a.y, a.m - 1, a.d - 29);
    const b = parse(q.from) || {
      y: defaultFrom.getFullYear(),
      m: defaultFrom.getMonth() + 1,
      d: defaultFrom.getDate(),
    };

    let from = { ...b };
    let to = { ...a };
    const fromKey = from.y * 10000 + from.m * 100 + from.d;
    const toKey = to.y * 10000 + to.m * 100 + to.d;
    if (fromKey > toKey) [from, to] = [to, from];

    for (const k of ["departmentId", "designationId"]) {
      if (q[k] && !mongoose.isValidObjectId(q[k])) fail(`Invalid ${k}`);
    }
    if (q.status && !["active", "inactive"].includes(q.status))
      fail("Invalid status");
    if (q.employmentType && !LABELS.employmentType[q.employmentType])
      fail("Invalid employmentType");
    if (q.gender && !LABELS.gender[q.gender]) fail("Invalid gender");

    return {
      departmentId: q.departmentId || null,
      designationId: q.designationId || null,
      status: q.status || null,
      employmentType: q.employmentType || null,
      gender: q.gender || null,
      search: (q.search || "").trim().toLowerCase(),
      // UTC range for joining / exit dates
      from: new Date(Date.UTC(from.y, from.m - 1, from.d)),
      to: new Date(Date.UTC(to.y, to.m - 1, to.d, 23, 59, 59, 999)),
      // server-local range for attendance rows (stored at local midnight)
      localFrom: new Date(from.y, from.m - 1, from.d),
      localTo: new Date(to.y, to.m - 1, to.d, 23, 59, 59, 999),
      fromKey: `${from.y}-${pad(from.m)}-${pad(from.d)}`,
      toKey: `${to.y}-${pad(to.m)}-${pad(to.d)}`,
    };
  }

  async _load(user, q) {
    const companyId = this._companyId(user, q.companyId);
    const f = this._filters(q);

    const query = { companyId: oid(companyId) };
    if (f.departmentId) query.departmentId = oid(f.departmentId);
    if (f.designationId) query.designationId = oid(f.designationId);
    if (f.status) query.status = f.status;
    if (f.gender) query.gender = f.gender;
    if (f.employmentType) {
      query.employmentType =
        f.employmentType === "full_time"
          ? { $in: ["full_time", null] }
          : f.employmentType;
    }

    const employees = await Employee.find(query)
      .populate("userId", "firstName lastName email profileImage")
      .populate("departmentId", "name")
      .populate("designationId", "name title")
      .sort({ id_int: 1 })
      .lean();

    const hours = await this._hours(
      companyId,
      employees.map((e) => e._id),
      f,
    );
    return { companyId, f, employees, hours };
  }

  async _hours(companyId, ids, f) {
    if (!ids.length) return new Map();
    const rows = await Attendance.aggregate([
      {
        $match: {
          companyId: oid(companyId),
          employeeId: { $in: ids },
          date: { $gte: f.localFrom, $lte: f.localTo },
          checkIn: { $ne: null },
          checkOut: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$employeeId",
          ms: { $sum: { $subtract: ["$checkOut", "$checkIn"] } },
          days: { $sum: 1 },
        },
      },
    ]);
    return new Map(
      rows.map((r) => [
        String(r._id),
        { hours: round2(r.ms / 3_600_000), days: r.days },
      ]),
    );
  }

  _rows(employees, hours) {
    const now = new Date();
    const todayUtc = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );

    return employees.map((e) => {
      const joined = e.joiningDate ? new Date(e.joiningDate) : null;
      const exit = e.exitDate ? new Date(e.exitDate) : null;
      const end = e.status === "inactive" && exit ? exit : now;
      const months = joined ? tenureMonths(joined, end) : 0;
      const h = hours.get(String(e._id)) || { hours: 0, days: 0 };
      const type = e.employmentType || "none";
      const gender = e.gender || "none";

      return {
        id: e._id,
        code: e.id_int ?? null,
        name: fullName(e.userId),
        email: e.userId?.email || e.personalEmail || "",
        profileImage: e.userId?.profileImage || null,
        departmentId: e.departmentId?._id || null,
        department: e.departmentId?.name || "Unassigned",
        designationId: e.designationId?._id || null,
        designation:
          e.designationId?.name || e.designationId?.title || "Unassigned",
        gender,
        genderLabel: LABELS.gender[gender],
        employmentType: type,
        employmentTypeLabel: LABELS.employmentType[type],
        status: e.status,
        statusLabel: LABELS.status[e.status] || e.status,
        joiningDate: joined,
        exitDate: exit,
        exitReason: e.exitReason || "",
        probation: probationStatus(e, todayUtc),
        probationEndDate: e.probationEndDate || null,
        tenureMonths: months,
        tenure: joined ? tenureText(months) : "-",
        hoursWorked: h.hours,
        attendanceDays: h.days,
        dateOfBirth: e.dateOfBirth || null,
      };
    });
  }

  async _summary(user, q) {
    const { companyId, f, employees, hours } = await this._load(user, q);
    const rows = this._rows(employees, hours);
    const active = rows.filter((r) => r.status === "active");
    const inactive = rows.filter((r) => r.status === "inactive");

    const inPeriod = (d) => d && d >= f.from && d <= f.to;
    const joiners = rows.filter((r) => inPeriod(r.joiningDate));
    const leavers = rows.filter((r) => inPeriod(r.exitDate));

    for (const r of rows) r.probationLabel = LABELS.probation[r.probation];

    // ---- working hours ----
    const attended = rows.filter((r) => r.attendanceDays > 0);
    const totalHours = round2(rows.reduce((n, r) => n + r.hoursWorked, 0));
    const totalDays = rows.reduce((n, r) => n + r.attendanceDays, 0);

    const hoursByDept = new Map();
    for (const r of rows) {
      const cur = hoursByDept.get(r.department) || { hours: 0, people: 0 };
      cur.hours += r.hoursWorked;
      if (r.attendanceDays > 0) cur.people += 1;
      hoursByDept.set(r.department, cur);
    }

    // ---- tenure (active employees) ----
    const tenureBuckets = TENURE_BUCKETS.map((b, i) => {
      const min = i === 0 ? 0 : TENURE_BUCKETS[i - 1].max;
      const count = active.filter(
        (r) => r.tenureMonths >= min && r.tenureMonths < b.max,
      ).length;
      return {
        key: b.key,
        label: b.label,
        count,
        percent: pct(count, active.length),
      };
    });
    const avgTenure = active.length
      ? Math.round(
          active.reduce((n, r) => n + r.tenureMonths, 0) / active.length,
        )
      : 0;

    // ---- monthly joiners / leavers across the period (max 24 months) ----
    const monthly = [];
    const cursor = new Date(
      Date.UTC(f.from.getUTCFullYear(), f.from.getUTCMonth(), 1),
    );
    const last = new Date(
      Date.UTC(f.to.getUTCFullYear(), f.to.getUTCMonth(), 1),
    );
    while (cursor <= last) {
      monthly.push({
        month: `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}`,
        label: `${MONTHS[cursor.getUTCMonth()]} ${String(cursor.getUTCFullYear()).slice(2)}`,
        joined: 0,
        left: 0,
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    const monthly24 = monthly.slice(-24);
    const mIndex = new Map(monthly24.map((m) => [m.month, m]));
    for (const r of joiners) {
      const m = mIndex.get(utcKey(r.joiningDate).slice(0, 7));
      if (m) m.joined += 1;
    }
    for (const r of leavers) {
      const m = mIndex.get(utcKey(r.exitDate).slice(0, 7));
      if (m) m.left += 1;
    }

    const settings = await CompanySettings.findOne({
      companyId: oid(companyId),
    })
      .select("workingHours attendancePolicy weekOff")
      .lean();
    const company = await Company.findById(companyId)
      .select("legalName tradeName logoUrl")
      .lean();

    return {
      rows,
      meta: { companyId, f },
      summary: {
        company: company
          ? {
              id: company._id,
              name: company.tradeName || company.legalName,
              logo: company.logoUrl || null,
            }
          : null,
        period: { from: f.fromKey, to: f.toKey },
        filters: {
          departmentId: f.departmentId,
          designationId: f.designationId,
          status: f.status,
          employmentType: f.employmentType,
          gender: f.gender,
        },
        kpis: {
          totalEmployees: rows.length,
          activeEmployees: active.length,
          inactiveEmployees: inactive.length,
          activePercent: pct(active.length, rows.length),
          newEmployees: joiners.length,
          employeesLeft: leavers.length,
          inactiveWithoutExitDate: inactive.filter((r) => !r.exitDate).length,
          onProbation: rows.filter(
            (r) => r.probation === "on_probation" && r.status === "active",
          ).length,
          confirmed: rows.filter((r) => r.probation === "confirmed").length,
          averageTenureMonths: avgTenure,
          averageTenure: tenureText(avgTenure),
          attritionPercent: pct(leavers.length, rows.length),
        },
        workingHours: {
          scheduledStart: settings?.workingHours?.startTime || "09:00",
          scheduledEnd: settings?.workingHours?.endTime || "18:00",
          fullDayMinHours: settings?.attendancePolicy?.fullDayMinHours ?? 8,
          weekOff: settings?.weekOff || ["sat", "sun"],
          totalHours,
          attendanceDays: totalDays,
          employeesWithAttendance: attended.length,
          averageHoursPerDay: totalDays ? round2(totalHours / totalDays) : 0,
          averageHoursPerEmployee: attended.length
            ? round2(totalHours / attended.length)
            : 0,
          byDepartment: [...hoursByDept.entries()]
            .map(([department, v]) => ({
              department,
              hours: round2(v.hours),
              employees: v.people,
              averagePerEmployee: v.people ? round2(v.hours / v.people) : 0,
            }))
            .sort((a, b) => b.hours - a.hours),
        },
        charts: {
          status: countBy(
            rows,
            (r) => r.status,
            (k) => LABELS.status[k] || k,
          ),
          byDepartment: countBy(rows, (r) => r.department),
          byDesignation: countBy(rows, (r) => r.designation),
          gender: countBy(
            rows,
            (r) => r.gender,
            (k) => LABELS.gender[k],
          ),
          employmentType: countBy(
            rows,
            (r) => r.employmentType,
            (k) => LABELS.employmentType[k],
          ),
          probation: countBy(
            rows.filter((r) => r.status === "active"),
            (r) => r.probation,
            (k) => LABELS.probation[k],
          ),
          tenure: tenureBuckets,
          monthly: monthly24,
        },
        newJoiners: joiners
          .sort((a, b) => b.joiningDate - a.joiningDate)
          .slice(0, 10)
          .map(
            ({
              id,
              name,
              profileImage,
              department,
              designation,
              joiningDate,
            }) => ({
              id,
              name,
              profileImage,
              department,
              designation,
              joiningDate,
            }),
          ),
        recentLeavers: leavers
          .sort((a, b) => b.exitDate - a.exitDate)
          .slice(0, 10)
          .map(
            ({
              id,
              name,
              profileImage,
              department,
              designation,
              exitDate,
              exitReason,
            }) => ({
              id,
              name,
              profileImage,
              department,
              designation,
              exitDate,
              exitReason,
            }),
          ),
      },
    };
  }

  async getSummary(user, q) {
    const { summary } = await this._summary(user, q);
    return summary;
  }

  async getDirectory(user, q) {
    const { rows, meta } = await this._summary(user, q);
    const { f } = meta;

    let list = rows;
    if (f.search) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(f.search) ||
          r.email.toLowerCase().includes(f.search) ||
          r.department.toLowerCase().includes(f.search) ||
          r.designation.toLowerCase().includes(f.search),
      );
    }

    const dir = String(q.dir).toLowerCase() === "desc" ? -1 : 1;
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name),
      department: (a, b) => a.department.localeCompare(b.department),
      joiningDate: (a, b) => (a.joiningDate || 0) - (b.joiningDate || 0),
      tenure: (a, b) => a.tenureMonths - b.tenureMonths,
      hours: (a, b) => a.hoursWorked - b.hoursWorked,
    };
    list = [...list].sort(
      (a, b) => dir * (sorters[q.sort] || sorters.name)(a, b),
    );

    const limit = Math.min(Math.max(Number(q.limit) || 20, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const total = list.length;

    return {
      data: list.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  /* ---------------- Excel ---------------- */

  async exportExcel(user, q) {
    const { rows, summary: s, meta } = await this._exportData(user, q);
    const { f } = meta;

    const [dept, desig] = await Promise.all([
      f.departmentId
        ? Department.findById(f.departmentId).select("name").lean()
        : null,
      f.designationId
        ? Designation.findById(f.designationId).select("name title").lean()
        : null,
    ]);

    const NAVY = "FF1F3A5F";
    const thin = { style: "thin", color: { argb: "FFD0D5DD" } };
    const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
    const solid = (argb) => ({
      type: "pattern",
      pattern: "solid",
      fgColor: { argb },
    });
    const header = (row) => {
      row.eachCell((c) => {
        c.font = { bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = solid(NAVY);
        c.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
        c.border = BORDER;
      });
      row.height = 22;
    };

    const wb = new ExcelJS.Workbook();
    wb.creator = s.company?.name || "HRMS";
    wb.created = new Date();

    // ---- Summary ----
    const ws = wb.addWorksheet("Summary", {
      views: [{ showGridLines: false }],
    });
    ws.columns = [
      { width: 34 },
      { width: 22 },
      { width: 4 },
      { width: 30 },
      { width: 22 },
    ];
    ws.mergeCells("A1:E1");
    const title = ws.getCell("A1");
    title.value = `${s.company?.name || "Company"} — Employee Report`;
    title.font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
    title.fill = solid(NAVY);
    title.alignment = { vertical: "middle", indent: 1 };
    ws.getRow(1).height = 34;

    const info = [
      ["Period", `${s.period.from} to ${s.period.to}`],
      ["Department", dept?.name || "All"],
      ["Designation", desig?.name || desig?.title || "All"],
      ["Status", f.status ? LABELS.status[f.status] : "All"],
      [
        "Employment type",
        f.employmentType ? LABELS.employmentType[f.employmentType] : "All",
      ],
      ["Gender", f.gender ? LABELS.gender[f.gender] : "All"],
      ["Generated on", new Date().toLocaleString("en-GB")],
    ];
    info.forEach(([k, v], i) => {
      const r = 3 + i;
      ws.getCell(`A${r}`).value = k;
      ws.getCell(`A${r}`).font = { bold: true, color: { argb: "FF475467" } };
      ws.getCell(`B${r}`).value = v;
      ws.getCell(`B${r}`).alignment = { horizontal: "left" };
    });

    const k = s.kpis;
    const w = s.workingHours;
    const left = [
      ["Total employees", k.totalEmployees, "FFDDEBF7"],
      ["Active employees", k.activeEmployees, "FFC6EFCE"],
      ["Inactive employees", k.inactiveEmployees, "FFD9D9D9"],
      ["New employees (period)", k.newEmployees, "FFB7E4DD"],
      ["Employees who left (period)", k.employeesLeft, "FFFFC7CE"],
      ["Attrition (period)", `${k.attritionPercent}%`, "FFFFC7CE"],
      ["On probation", k.onProbation, "FFFFEB9C"],
      ["Confirmed", k.confirmed, "FFC6EFCE"],
      ["Average tenure", k.averageTenure, "FFE4DFEC"],
    ];
    const right = [
      [
        "Scheduled hours",
        `${w.scheduledStart} – ${w.scheduledEnd}`,
        "FFF2F2F2",
      ],
      ["Full day minimum", `${w.fullDayMinHours}h`, "FFF2F2F2"],
      ["Total hours worked (period)", w.totalHours, "FFDDEBF7"],
      ["Attendance days (period)", w.attendanceDays, "FFDDEBF7"],
      ["Avg hours per day", w.averageHoursPerDay, "FFDDEBF7"],
      ["Avg hours per employee", w.averageHoursPerEmployee, "FFDDEBF7"],
      ["Employees with attendance", w.employeesWithAttendance, "FFDDEBF7"],
    ];
    let r = 11;
    ws.getCell(`A${r}`).value = "Headcount";
    ws.getCell(`B${r}`).value = "Value";
    ws.getCell(`D${r}`).value = "Working hours";
    ws.getCell(`E${r}`).value = "Value";
    ["A", "B", "D", "E"].forEach((c) =>
      header({
        eachCell: (fn) => fn(ws.getCell(`${c}${r}`)),
        set height(_) {},
      }),
    );
    ws.getRow(r).height = 22;
    left.forEach(([label, value, fill], i) => {
      const a = ws.getCell(`A${r + 1 + i}`);
      const b = ws.getCell(`B${r + 1 + i}`);
      a.value = label;
      b.value = value;
      a.fill = solid(fill);
      a.font = { bold: true };
      b.alignment = { horizontal: "center" };
      b.font = { bold: true };
      a.border = BORDER;
      b.border = BORDER;
    });
    right.forEach(([label, value, fill], i) => {
      const a = ws.getCell(`D${r + 1 + i}`);
      const b = ws.getCell(`E${r + 1 + i}`);
      a.value = label;
      b.value = value;
      a.fill = solid(fill);
      a.font = { bold: true };
      b.alignment = { horizontal: "center" };
      b.font = { bold: true };
      a.border = BORDER;
      b.border = BORDER;
    });

    // ---- Distributions (with data bars) ----
    const dist = wb.addWorksheet("Distribution", {
      views: [{ showGridLines: false }],
    });
    dist.columns = [{ width: 32 }, { width: 14 }, { width: 12 }];
    const sections = [
      ["By department", s.charts.byDepartment],
      ["By designation", s.charts.byDesignation],
      ["Gender", s.charts.gender],
      ["Employment type", s.charts.employmentType],
      ["Probation (active)", s.charts.probation],
      ["Tenure (active)", s.charts.tenure],
      ["Status", s.charts.status],
    ];
    let dr = 1;
    for (const [name, items] of sections) {
      dist.getCell(dr, 1).value = name;
      dist.getCell(dr, 2).value = "Employees";
      dist.getCell(dr, 3).value = "Share";
      header(dist.getRow(dr));
      const start = dr + 1;
      items.forEach((it, i) => {
        const row = dist.getRow(start + i);
        row.getCell(1).value = it.label;
        row.getCell(2).value = it.count;
        row.getCell(3).value = it.percent / 100;
        row.getCell(3).numFmt = "0.0%";
        [1, 2, 3].forEach((c) => (row.getCell(c).border = BORDER));
        row.getCell(2).alignment = { horizontal: "center" };
        row.getCell(3).alignment = { horizontal: "center" };
      });
      if (items.length) {
        dist.addConditionalFormatting({
          ref: `B${start}:B${start + items.length - 1}`,
          rules: [
            {
              type: "dataBar",
              gradient: false,
              cfvo: [{ type: "num", value: 0 }, { type: "max" }],
              color: { argb: "FF5B9BD5" },
            },
          ],
        });
      }
      dr = start + items.length + 1;
    }

    // ---- Joiners & leavers by month ----
    const mo = wb.addWorksheet("Joiners & Leavers");
    mo.columns = [{ width: 14 }, { width: 12 }, { width: 12 }, { width: 12 }];
    mo.addRow(["Month", "Joined", "Left", "Net"]);
    header(mo.getRow(1));
    s.charts.monthly.forEach((m) => {
      const row = mo.addRow([m.label, m.joined, m.left, m.joined - m.left]);
      row.eachCell((c) => (c.border = BORDER));
      row.getCell(2).fill = solid("FFC6EFCE");
      row.getCell(3).fill = solid("FFFFC7CE");
      [2, 3, 4].forEach(
        (c) => (row.getCell(c).alignment = { horizontal: "center" }),
      );
    });
    const lastM = mo.rowCount;
    if (lastM > 1) {
      const t = mo.addRow([
        "Total",
        { formula: `SUM(B2:B${lastM})` },
        { formula: `SUM(C2:C${lastM})` },
        { formula: `SUM(D2:D${lastM})` },
      ]);
      t.eachCell((c) => {
        c.font = { bold: true };
        c.fill = solid("FFE7ECF3");
        c.alignment = { horizontal: "center" };
      });
    }

    // ---- Directory ----
    const dirWs = wb.addWorksheet("Directory", {
      views: [{ state: "frozen", ySplit: 1, xSplit: 3 }],
    });
    dirWs.columns = [
      { header: "ID", key: "code", width: 8 },
      { header: "Name", key: "name", width: 26 },
      { header: "Email", key: "email", width: 30 },
      { header: "Department", key: "department", width: 18 },
      { header: "Designation", key: "designation", width: 20 },
      { header: "Gender", key: "gender", width: 14 },
      { header: "Employment type", key: "type", width: 16 },
      { header: "Status", key: "status", width: 11 },
      { header: "Joining date", key: "joining", width: 13 },
      { header: "Tenure", key: "tenure", width: 10 },
      { header: "Probation", key: "probation", width: 14 },
      { header: "Exit date", key: "exit", width: 13 },
      { header: "Exit reason", key: "reason", width: 24 },
      { header: "Hours worked (period)", key: "hours", width: 14 },
      { header: "Days present (period)", key: "days", width: 14 },
    ];
    header(dirWs.getRow(1));

    const STATUS_FILL = {
      active: ["FFC6EFCE", "FF006100"],
      inactive: ["FFD9D9D9", "FF595959"],
    };
    const PROB_FILL = {
      on_probation: ["FFFFEB9C", "FF9C5700"],
      confirmed: ["FFC6EFCE", "FF006100"],
      not_set: ["FFF2F2F2", "FF7F7F7F"],
    };

    rows.forEach((e) => {
      const row = dirWs.addRow({
        code: e.code,
        name: e.name,
        email: e.email,
        department: e.department,
        designation: e.designation,
        gender: e.genderLabel,
        type: e.employmentTypeLabel,
        status: e.statusLabel,
        joining: e.joiningDate,
        tenure: e.tenure,
        probation: LABELS.probation[e.probation],
        exit: e.exitDate,
        reason: e.exitReason,
        hours: e.hoursWorked,
        days: e.attendanceDays,
      });
      row.eachCell({ includeEmpty: true }, (c) => (c.border = BORDER));
      row.getCell("joining").numFmt = "dd mmm yyyy";
      row.getCell("exit").numFmt = "dd mmm yyyy";
      row.getCell("hours").numFmt = "0.00";

      const [sf, sc] = STATUS_FILL[e.status] || STATUS_FILL.inactive;
      row.getCell("status").fill = solid(sf);
      row.getCell("status").font = { bold: true, color: { argb: sc } };
      const [pf, pc] = PROB_FILL[e.probation];
      row.getCell("probation").fill = solid(pf);
      row.getCell("probation").font = { color: { argb: pc } };
      if (e.status === "inactive") {
        ["name", "email", "department", "designation"].forEach((key) => {
          row.getCell(key).font = { color: { argb: "FF7F7F7F" } };
        });
      }
      [
        "code",
        "gender",
        "type",
        "status",
        "joining",
        "tenure",
        "probation",
        "exit",
        "hours",
        "days",
      ].forEach(
        (key) => (row.getCell(key).alignment = { horizontal: "center" }),
      );
    });
    dirWs.autoFilter = { from: "A1", to: "O1" };

    const slug = (s.company?.name || "company")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    return {
      buffer: await wb.xlsx.writeBuffer(),
      filename: `employee-report-${slug}-${s.period.from}_to_${s.period.to}.xlsx`,
    };
  }

  async _exportData(user, q) {
    const { rows, summary, meta } = await this._summary(user, q);
    return { rows, summary, meta };
  }
}

module.exports = new EmployeeReportService();
