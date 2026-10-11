import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import { FILE_BASE } from "../config";
import { listOptions } from "../services/employeeService";
import {
  getEmployeeReport,
  getEmployeeDirectory,
  exportEmployeeReport,
} from "../services/reportService";

const pad = (n) => String(n).padStart(2, "0");
const toKey = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date();
const monthAgo = new Date(
  today.getFullYear(),
  today.getMonth(),
  today.getDate() - 29,
);

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#7c3aed",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#64748b",
];
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";
const initials = (n = "") =>
  n
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

function Avatar({ name, src, size = 30 }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={`${FILE_BASE}${src}`}
        alt={name}
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span
      className="co-avatar"
      style={{ background: "#3b82f6", borderRadius: "50%" }}
    >
      {initials(name)}
    </span>
  );
}

function Donut({ items, size = 150, stroke = 22 }) {
  const total = items.reduce((n, i) => n + i.count, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        flexWrap: "wrap",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {items.map((it, i) => {
            const dash = (it.count / total) * c;
            const el = (
              <circle
                key={it.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return el;
          })}
        </g>
        <text
          x="50%"
          y="52%"
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fill="var(--text)"
        >
          {items.reduce((n, i) => n + i.count, 0)}
        </text>
      </svg>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          flex: 1,
          minWidth: 130,
        }}
      >
        {items.map((it, i) => (
          <li
            key={it.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: COLORS[i % COLORS.length],
              }}
            />
            <span style={{ color: "var(--text-dim)" }}>{it.label}</span>
            <strong style={{ marginLeft: "auto" }}>{it.count}</strong>
            <span
              className="muted"
              style={{ fontSize: 11.5, width: 44, textAlign: "right" }}
            >
              {it.percent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bars({ items, limit = 8, unit = "" }) {
  const shown = items.slice(0, limit);
  const max = Math.max(1, ...shown.map((i) => i.count));
  if (!shown.length) return <p className="muted">No data.</p>;
  return (
    <div>
      {shown.map((it, i) => (
        <div key={it.key ?? it.label} style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              marginBottom: 5,
            }}
          >
            <span>{it.label}</span>
            <strong>
              {it.count}
              {unit}
            </strong>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "var(--surface-2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(it.count / max) * 100}%`,
                background: COLORS[i % COLORS.length],
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      ))}
      {items.length > limit && (
        <div className="muted" style={{ fontSize: 12 }}>
          +{items.length - limit} more in the Excel export
        </div>
      )}
    </div>
  );
}

function JoinersLeavers({ data }) {
  const max = Math.max(1, ...data.flatMap((m) => [m.joined, m.left]));
  if (!data.length) return <p className="muted">No data.</p>;
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          height: 150,
          overflowX: "auto",
        }}
      >
        {data.map((m) => (
          <div
            key={m.month}
            style={{ minWidth: 36, flex: 1, textAlign: "center" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: 3,
                height: 120,
              }}
            >
              <div
                title={`${m.joined} joined`}
                style={{
                  width: 12,
                  height: `${(m.joined / max) * 100}%`,
                  minHeight: m.joined ? 3 : 0,
                  background: "#10b981",
                  borderRadius: 3,
                }}
              />
              <div
                title={`${m.left} left`}
                style={{
                  width: 12,
                  height: `${(m.left / max) * 100}%`,
                  minHeight: m.left ? 3 : 0,
                  background: "#ef4444",
                  borderRadius: 3,
                }}
              />
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 12, marginTop: 8 }}>
        <span>
          <i
            style={{
              display: "inline-block",
              width: 9,
              height: 9,
              background: "#10b981",
              borderRadius: 2,
            }}
          />{" "}
          Joined
        </span>
        <span>
          <i
            style={{
              display: "inline-block",
              width: 9,
              height: 9,
              background: "#ef4444",
              borderRadius: 2,
            }}
          />{" "}
          Left
        </span>
      </div>
    </div>
  );
}

const PROB_BADGE = {
  on_probation: "warning",
  confirmed: "success",
  not_set: "plan-default",
};

export default function EmployeeReport() {
  const [filters, setFilters] = useState({
    from: toKey(monthAgo),
    to: toKey(today),
    departmentId: "",
    designationId: "",
    status: "",
    employmentType: "",
    gender: "",
  });
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [report, setReport] = useState(null);
  const [dir, setDir] = useState({
    data: [],
    pagination: { page: 1, total: 0, total_pages: 1, limit: 15 },
  });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "name", dir: "asc" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listOptions("departments")
      .then(setDepartments)
      .catch(() => {});
    listOptions("designations")
      .then(setDesignations)
      .catch(() => {});
  }, []);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const loadDirectory = useCallback(
    async (page = 1) => {
      const res = await getEmployeeDirectory(filters, {
        page,
        limit: 15,
        search,
        sort: sort.field,
        dir: sort.dir,
      });
      setDir(res.data.data);
    },
    [filters, search, sort],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getEmployeeReport(filters);
        if (!cancelled) setReport(res.data.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
    loadDirectory(1).catch(() => {});
  }, [loadDirectory]);

  const download = async () => {
    try {
      setBusy(true);
      const res = await exportEmployeeReport(filters);
      const name =
        (res.headers["content-disposition"] || "").match(
          /filename="?([^"]+)"?/,
        )?.[1] || "employee-report.xlsx";
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const toggleSort = (field) =>
    setSort((s) =>
      s.field === field
        ? { field, dir: s.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" },
    );
  const arrow = (field) =>
    sort.field === field ? (sort.dir === "asc" ? " ▲" : " ▼") : "";

  const k = report?.kpis;
  const w = report?.workingHours;
  const p = dir.pagination;
  const hoursByDept = useMemo(
    () =>
      (w?.byDepartment || []).map((d) => ({
        key: d.department,
        label: d.department,
        count: d.hours,
      })),
    [w],
  );

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span>Reports</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Employee Report</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Employee Report</h1>
          <p>
            Headcount, joiners and leavers, tenure and working hours for{" "}
            {report?.company?.name || "your company"}.
          </p>
        </div>
        <button className="btn primary" disabled={busy} onClick={download}>
          <Icon name="fileText" size={16} />{" "}
          {busy ? "Preparing..." : "Export Excel"}
        </button>
      </div>

      {/* Filters */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <label className="muted" style={{ fontSize: 12.5 }}>
            Period
          </label>
          <input
            type="date"
            className="lang-btn"
            value={filters.from}
            max={filters.to}
            onChange={set("from")}
          />
          <span className="muted">to</span>
          <input
            type="date"
            className="lang-btn"
            value={filters.to}
            min={filters.from}
            onChange={set("to")}
          />

          <select
            className="lang-btn"
            value={filters.departmentId}
            onChange={set("departmentId")}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            className="lang-btn"
            value={filters.designationId}
            onChange={set("designationId")}
          >
            <option value="">All designations</option>
            {designations.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name || d.title}
              </option>
            ))}
          </select>
          <select
            className="lang-btn"
            value={filters.status}
            onChange={set("status")}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            className="lang-btn"
            value={filters.employmentType}
            onChange={set("employmentType")}
          >
            <option value="">All types</option>
            <option value="full_time">Full time</option>
            <option value="part_time">Part time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
          </select>
          <select
            className="lang-btn"
            value={filters.gender}
            onChange={set("gender")}
          >
            <option value="">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          The period drives new joiners, leavers and hours worked. The other
          filters narrow the employees.
        </div>
      </section>

      {error && (
        <div style={{ color: "var(--red)", marginBottom: 14 }}>{error}</div>
      )}
      {loading && !report ? (
        <div className="muted" style={{ padding: "24px 0" }}>
          Loading report...
        </div>
      ) : report ? (
        <div style={{ opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
          <div className="stat-grid">
            <StatCard
              tone="blue"
              icon="users"
              label="Total Employees"
              value={k.totalEmployees}
            />
            <StatCard
              tone="green"
              icon="userCheck"
              label="Active"
              value={k.activeEmployees}
            />
            <StatCard
              tone="orange"
              icon="users"
              label="Inactive"
              value={k.inactiveEmployees}
            />
            <StatCard
              tone="purple"
              icon="userPlus"
              label="New (period)"
              value={k.newEmployees}
            />
          </div>
          <div className="stat-grid">
            <StatCard
              tone="orange"
              icon="activity"
              label="Left (period)"
              value={k.employeesLeft}
            />
            <StatCard
              tone="blue"
              icon="clock"
              label="On Probation"
              value={k.onProbation}
            />
            <StatCard
              tone="green"
              icon="calendar"
              label="Avg Tenure"
              value={k.averageTenure}
            />
            <StatCard
              tone="purple"
              icon="clock"
              label="Hours Worked"
              value={w.totalHours}
            />
          </div>

          <div
            className="row row-3col"
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            <section className="panel">
              <div className="panel-head">
                <h2>
                  <Icon name="users" size={16} /> Status
                </h2>
              </div>
              <Donut items={report.charts.status} />
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>
                  <Icon name="users" size={16} /> Gender
                </h2>
              </div>
              <Donut items={report.charts.gender} />
            </section>
          </div>

          <div
            className="row row-3col"
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            <section className="panel">
              <div className="panel-head">
                <h2>
                  <Icon name="briefcase" size={16} /> Employment Type
                </h2>
              </div>
              <Donut items={report.charts.employmentType} />
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>
                  <Icon name="clock" size={16} /> Probation (active)
                </h2>
              </div>
              <Donut items={report.charts.probation} />
            </section>
          </div>

          <div
            className="row row-3col"
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            <section className="panel">
              <div className="panel-head">
                <h2>
                  <Icon name="barChart" size={16} /> By Department
                </h2>
              </div>
              <Bars items={report.charts.byDepartment} />
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>
                  <Icon name="barChart" size={16} /> By Designation
                </h2>
              </div>
              <Bars items={report.charts.byDesignation} />
            </section>
          </div>

          <div
            className="row row-3col"
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            <section className="panel">
              <div className="panel-head">
                <h2>
                  <Icon name="calendar" size={16} /> Tenure (active)
                </h2>
              </div>
              <Bars items={report.charts.tenure} />
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>
                  <Icon name="activity" size={16} /> Joiners vs Leavers
                </h2>
              </div>
              <JoinersLeavers data={report.charts.monthly} />
            </section>
          </div>

          <section className="panel">
            <div className="panel-head">
              <h2>
                <Icon name="clock" size={16} /> Working Hours by Department
              </h2>
              <span className="muted" style={{ fontSize: 12.5 }}>
                Scheduled {w.scheduledStart}–{w.scheduledEnd} · avg{" "}
                {w.averageHoursPerDay}h/day · {w.employeesWithAttendance}{" "}
                employees
              </span>
            </div>
            <Bars items={hoursByDept} unit="h" />
          </section>

          <div
            className="row row-3col"
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            <section className="panel">
              <div className="panel-head">
                <h2>
                  <Icon name="userPlus" size={16} /> New Employees
                </h2>
              </div>
              {report.newJoiners.length === 0 ? (
                <p className="muted">No new joiners in this period.</p>
              ) : (
                report.newJoiners.map((e) => (
                  <div
                    key={e.id}
                    className="company-cell"
                    style={{ marginBottom: 10 }}
                  >
                    <Avatar name={e.name} src={e.profileImage} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{e.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {e.designation} · {e.department} ·{" "}
                        {fmtDate(e.joiningDate)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>
                  <Icon name="users" size={16} /> Employees Who Left
                </h2>
              </div>
              {report.recentLeavers.length === 0 ? (
                <p className="muted">Nobody left in this period.</p>
              ) : (
                report.recentLeavers.map((e) => (
                  <div
                    key={e.id}
                    className="company-cell"
                    style={{ marginBottom: 10 }}
                  >
                    <Avatar name={e.name} src={e.profileImage} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{e.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {e.designation} · {fmtDate(e.exitDate)}
                        {e.exitReason ? ` · ${e.exitReason}` : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>

          {/* Directory */}
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Employee Directory</h2>
                <p>{p.total} employees match the filters.</p>
              </div>
              <div className="panel-tools">
                <div className="search-box">
                  <Icon name="search" size={16} />
                  <input
                    type="text"
                    placeholder="Search name, email, department..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleSort("name")}
                    >
                      Employee{arrow("name")}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleSort("department")}
                    >
                      Department{arrow("department")}
                    </th>
                    <th>Designation</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleSort("joiningDate")}
                    >
                      Joined{arrow("joiningDate")}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleSort("tenure")}
                    >
                      Tenure{arrow("tenure")}
                    </th>
                    <th>Probation</th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleSort("hours")}
                    >
                      Hours{arrow("hours")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dir.data.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="muted"
                        style={{ textAlign: "center", padding: 24 }}
                      >
                        No employees found.
                      </td>
                    </tr>
                  )}
                  {dir.data.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <div className="company-cell">
                          <Avatar name={e.name} src={e.profileImage} />
                          <div>
                            <div style={{ fontWeight: 500 }}>{e.name}</div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {e.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{e.department}</td>
                      <td>{e.designation}</td>
                      <td>{e.employmentTypeLabel}</td>
                      <td>
                        <span
                          className={`badge ${e.status === "active" ? "success" : "warning"}`}
                        >
                          {e.statusLabel}
                        </span>
                      </td>
                      <td>{fmtDate(e.joiningDate)}</td>
                      <td>{e.tenure}</td>
                      <td>
                        <span className={`badge ${PROB_BADGE[e.probation]}`}>
                          {e.probationLabel}
                        </span>
                      </td>
                      <td>{e.hoursWorked}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                Page {p.page} of {p.total_pages || 1}
              </span>
              <div className="pager">
                <button
                  disabled={p.page <= 1}
                  onClick={() => loadDirectory(p.page - 1)}
                >
                  <Icon name="chevronLeft" size={14} />
                </button>
                <button
                  disabled={p.page >= p.total_pages}
                  onClick={() => loadDirectory(p.page + 1)}
                >
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
