const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const Company = require("../models/company.model");
const Employee = require("../models/employee.model");
const User = require("../models/user.model");

const pad = (n) => String(n).padStart(2, "0");
const fail = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
};
const pct = (part, whole) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0;
const monthKey = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
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

// ASSUMPTION: adapt to your Company model if the field names differ.
const statusOf = (c) =>
  c.status || (c.isActive === false ? "inactive" : "active");
const nameOf = (c) => c.tradeName || c.legalName || "-";
const emailOf = (c) => c.email || c.contactEmail || "";

const SIZE_BANDS = [
  { key: "1-10", label: "1 – 10 employees", min: 1, max: 10 },
  { key: "11-50", label: "11 – 50 employees", min: 11, max: 50 },
  { key: "51-200", label: "51 – 200 employees", min: 51, max: 200 },
  { key: "200+", label: "200+ employees", min: 201, max: Infinity },
];

class CompanyReportService {
  _assert(user) {
    if (user.role !== "super_admin")
      fail("Only super admin can view the company report", 403);
  }

  _filters(q = {}) {
    const parse = (s) => {
      if (!s) return null;
      const [y, m, d] = String(s).split("-").map(Number);
      return y && m && d ? { y, m, d } : null;
    };
    const t = new Date();
    const b = parse(q.to) || {
      y: t.getFullYear(),
      m: t.getMonth() + 1,
      d: t.getDate(),
    };
    const dfrom = new Date(b.y, b.m - 1, b.d - 29);
    const a = parse(q.from) || {
      y: dfrom.getFullYear(),
      m: dfrom.getMonth() + 1,
      d: dfrom.getDate(),
    };
    let from = a,
      to = b;
    if (
      from.y * 10000 + from.m * 100 + from.d >
      to.y * 10000 + to.m * 100 + to.d
    )
      [from, to] = [to, from];

    if (q.status && !["active", "inactive"].includes(q.status))
      fail("Invalid status");

    return {
      status: q.status || null,
      search: (q.search || "").trim().toLowerCase(),
      from: new Date(Date.UTC(from.y, from.m - 1, from.d)),
      to: new Date(Date.UTC(to.y, to.m - 1, to.d, 23, 59, 59, 999)),
      fromKey: `${from.y}-${pad(from.m)}-${pad(from.d)}`,
      toKey: `${to.y}-${pad(to.m)}-${pad(to.d)}`,
    };
  }

  async _build(user, q) {
    this._assert(user);
    const f = this._filters(q);

    const [companies, empAgg, userAgg] = await Promise.all([
      Company.find().sort({ createdAt: -1 }).lean(),
      Employee.aggregate([
        {
          $group: {
            _id: "$companyId",
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
            joined: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$joiningDate", f.from] },
                      { $lte: ["$joiningDate", f.to] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            left: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$exitDate", f.from] },
                      { $lte: ["$exitDate", f.to] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      User.aggregate([{ $group: { _id: "$companyId", users: { $sum: 1 } } }]),
    ]);

    const emp = new Map(empAgg.map((r) => [String(r._id), r]));
    const usr = new Map(userAgg.map((r) => [String(r._id), r.users]));

    let rows = companies.map((c) => {
      const e = emp.get(String(c._id)) || {
        total: 0,
        active: 0,
        joined: 0,
        left: 0,
      };
      return {
        id: c._id,
        name: nameOf(c),
        legalName: c.legalName || "",
        email: emailOf(c),
        logo: c.logoUrl || null,
        status: statusOf(c),
        createdAt: c.createdAt || null,
        employees: e.total,
        activeEmployees: e.active,
        inactiveEmployees: e.total - e.active,
        joinedInPeriod: e.joined,
        leftInPeriod: e.left,
        users: usr.get(String(c._id)) || 0,
      };
    });

    if (f.status) rows = rows.filter((r) => r.status === f.status);
    if (f.search)
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(f.search) ||
          r.legalName.toLowerCase().includes(f.search) ||
          r.email.toLowerCase().includes(f.search),
      );
    return { f, rows };
  }

  async _summary(user, q) {
    const { f, rows } = await this._build(user, q);
    const inPeriod = (d) => d && new Date(d) >= f.from && new Date(d) <= f.to;
    const newCompanies = rows.filter((r) => inPeriod(r.createdAt));
    const active = rows.filter((r) => r.status === "active");
    const totalEmployees = rows.reduce((n, r) => n + r.employees, 0);
    const activeEmployees = rows.reduce((n, r) => n + r.activeEmployees, 0);

    const countBy = (list, keyFn, labelFn) => {
      const m = new Map();
      list.forEach((i) => m.set(keyFn(i), (m.get(keyFn(i)) || 0) + 1));
      return [...m.entries()]
        .map(([key, count]) => ({
          key,
          label: labelFn(key),
          count,
          percent: pct(count, list.length),
        }))
        .sort((a, b) => b.count - a.count);
    };

    const sizes = SIZE_BANDS.map((b) => {
      const count = rows.filter(
        (r) => r.employees >= b.min && r.employees <= b.max,
      ).length;
      return {
        key: b.key,
        label: b.label,
        count,
        percent: pct(count, rows.length),
      };
    });
    const noEmployees = rows.filter((r) => r.employees === 0).length;
    sizes.unshift({
      key: "0",
      label: "No employees",
      count: noEmployees,
      percent: pct(noEmployees, rows.length),
    });

    // monthly new companies across the period (max 24 months)
    const monthly = [];
    const cur = new Date(
      Date.UTC(f.from.getUTCFullYear(), f.from.getUTCMonth(), 1),
    );
    const last = new Date(
      Date.UTC(f.to.getUTCFullYear(), f.to.getUTCMonth(), 1),
    );
    while (cur <= last) {
      monthly.push({
        month: monthKey(cur),
        label: `${MONTHS[cur.getUTCMonth()]} ${String(cur.getUTCFullYear()).slice(2)}`,
        count: 0,
      });
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    const monthly24 = monthly.slice(-24);
    const idx = new Map(monthly24.map((m) => [m.month, m]));
    newCompanies.forEach((r) => {
      const m = idx.get(monthKey(new Date(r.createdAt)));
      if (m) m.count += 1;
    });

    return {
      period: { from: f.fromKey, to: f.toKey },
      kpis: {
        totalCompanies: rows.length,
        activeCompanies: active.length,
        inactiveCompanies: rows.length - active.length,
        newCompanies: newCompanies.length,
        totalEmployees,
        activeEmployees,
        totalUsers: rows.reduce((n, r) => n + r.users, 0),
        averageEmployeesPerCompany: rows.length
          ? Math.round((totalEmployees / rows.length) * 10) / 10
          : 0,
        joinedInPeriod: rows.reduce((n, r) => n + r.joinedInPeriod, 0),
        leftInPeriod: rows.reduce((n, r) => n + r.leftInPeriod, 0),
        companiesWithoutEmployees: noEmployees,
      },
      charts: {
        status: countBy(
          rows,
          (r) => r.status,
          (k) => (k === "active" ? "Active" : "Inactive"),
        ),
        size: sizes,
        monthly: monthly24,
        topByEmployees: [...rows]
          .sort((a, b) => b.employees - a.employees)
          .slice(0, 10)
          .map((r) => ({
            key: String(r.id),
            label: r.name,
            count: r.employees,
          })),
      },
      recentCompanies: newCompanies
        .slice(0, 10)
        .map(({ id, name, logo, createdAt, employees }) => ({
          id,
          name,
          logo,
          createdAt,
          employees,
        })),
    };
  }

  async getSummary(user, q) {
    return this._summary(user, q);
  }

  async getDirectory(user, q) {
    const { rows } = await this._build(user, q);
    const dir = String(q.dir).toLowerCase() === "desc" ? -1 : 1;
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name),
      employees: (a, b) => a.employees - b.employees,
      users: (a, b) => a.users - b.users,
      createdAt: (a, b) =>
        new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
    };
    const list = [...rows].sort(
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

  async exportExcel(user, q) {
    const { rows } = await this._build(user, q);
    const s = await this._summary(user, q);
    const NAVY = "FF1F3A5F";
    const thin = { style: "thin", color: { argb: "FFD0D5DD" } };
    const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
    const header = (row) =>
      row.eachCell((c) => {
        c.font = { bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        c.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
        c.border = BORDER;
      });

    const wb = new ExcelJS.Workbook();
    wb.created = new Date();

    const ws = wb.addWorksheet("Summary", {
      views: [{ showGridLines: false }],
    });
    ws.columns = [{ width: 36 }, { width: 18 }];
    ws.addRow(["Company Report"]).font = { bold: true, size: 16 };
    ws.addRow(["Period", `${s.period.from} to ${s.period.to}`]);
    ws.addRow(["Generated on", new Date().toLocaleString("en-GB")]);
    ws.addRow([]);
    header(ws.addRow(["Metric", "Value"]));
    const k = s.kpis;
    [
      ["Total companies", k.totalCompanies],
      ["Active companies", k.activeCompanies],
      ["Inactive companies", k.inactiveCompanies],
      ["New companies (period)", k.newCompanies],
      ["Total employees", k.totalEmployees],
      ["Active employees", k.activeEmployees],
      ["Total users", k.totalUsers],
      ["Avg employees / company", k.averageEmployeesPerCompany],
      ["Employees joined (period)", k.joinedInPeriod],
      ["Employees left (period)", k.leftInPeriod],
      ["Companies without employees", k.companiesWithoutEmployees],
    ].forEach(([a, b]) => {
      const r = ws.addRow([a, b]);
      r.eachCell((c) => (c.border = BORDER));
      r.getCell(2).alignment = { horizontal: "center" };
    });

    const cs = wb.addWorksheet("Companies", {
      views: [{ state: "frozen", ySplit: 1, xSplit: 1 }],
    });
    cs.columns = [
      { header: "Company", key: "name", width: 28 },
      { header: "Legal name", key: "legal", width: 28 },
      { header: "Email", key: "email", width: 28 },
      { header: "Status", key: "status", width: 11 },
      { header: "Created", key: "created", width: 13 },
      { header: "Users", key: "users", width: 9 },
      { header: "Employees", key: "employees", width: 11 },
      { header: "Active", key: "active", width: 9 },
      { header: "Inactive", key: "inactive", width: 9 },
      { header: "Joined (period)", key: "joined", width: 13 },
      { header: "Left (period)", key: "left", width: 13 },
    ];
    header(cs.getRow(1));
    rows.forEach((r) => {
      const row = cs.addRow({
        name: r.name,
        legal: r.legalName,
        email: r.email,
        status: r.status === "active" ? "Active" : "Inactive",
        created: r.createdAt,
        users: r.users,
        employees: r.employees,
        active: r.activeEmployees,
        inactive: r.inactiveEmployees,
        joined: r.joinedInPeriod,
        left: r.leftInPeriod,
      });
      row.eachCell({ includeEmpty: true }, (c) => (c.border = BORDER));
      row.getCell("created").numFmt = "dd mmm yyyy";
    });
    cs.autoFilter = { from: "A1", to: "K1" };

    return {
      buffer: await wb.xlsx.writeBuffer(),
      filename: `company-report-${s.period.from}_to_${s.period.to}.xlsx`,
    };
  }
}

module.exports = new CompanyReportService();
