import { useCallback, useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import { FILE_BASE } from "../config";
import {
  getCompanyReport,
  getCompanyDirectory,
  exportCompanyReport,
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

function Bars({ items, limit = 10 }) {
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
              {it.percent !== undefined && (
                <span
                  className="muted"
                  style={{ fontSize: 11.5, marginLeft: 6 }}
                >
                  {it.percent}%
                </span>
              )}
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
    </div>
  );
}

function MonthlyBars({ data }) {
  const max = Math.max(1, ...data.map((m) => m.count));
  if (!data.length) return <p className="muted">No data.</p>;
  return (
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
              height: 120,
            }}
          >
            <div
              title={`${m.count} new`}
              style={{
                width: 18,
                height: `${(m.count / max) * 100}%`,
                minHeight: m.count ? 3 : 0,
                background: "#3b82f6",
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
  );
}

export default function CompanyReport() {
  const [filters, setFilters] = useState({
    from: toKey(monthAgo),
    to: toKey(today),
    status: "",
  });
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

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const loadDirectory = useCallback(
    async (page = 1) => {
      const res = await getCompanyDirectory(filters, {
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
        const res = await getCompanyReport(filters);
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
      const res = await exportCompanyReport(filters);
      const name =
        (res.headers["content-disposition"] || "").match(
          /filename="?([^"]+)"?/,
        )?.[1] || "company-report.xlsx";
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
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
  const p = dir.pagination;

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span>Reports</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Company Report</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Company Report</h1>
          <p>Companies, headcount, users and growth across the platform.</p>
        </div>
        <button className="btn primary" disabled={busy} onClick={download}>
          <Icon name="fileText" size={16} />{" "}
          {busy ? "Preparing..." : "Export Excel"}
        </button>
      </div>

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
            value={filters.status}
            onChange={set("status")}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          The period drives new companies and employees joined / left.
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
              icon="briefcase"
              label="Total Companies"
              value={k.totalCompanies}
            />
            <StatCard
              tone="green"
              icon="userCheck"
              label="Active"
              value={k.activeCompanies}
            />
            <StatCard
              tone="orange"
              icon="users"
              label="Inactive"
              value={k.inactiveCompanies}
            />
            <StatCard
              tone="purple"
              icon="userPlus"
              label="New (period)"
              value={k.newCompanies}
            />
          </div>
          <div className="stat-grid">
            <StatCard
              tone="blue"
              icon="users"
              label="Total Employees"
              value={k.totalEmployees}
            />
            <StatCard
              tone="green"
              icon="users"
              label="Total Users"
              value={k.totalUsers}
            />
            <StatCard
              tone="purple"
              icon="activity"
              label="Avg Employees / Co."
              value={k.averageEmployeesPerCompany}
            />
            <StatCard
              tone="orange"
              icon="clock"
              label="No Employees Yet"
              value={k.companiesWithoutEmployees}
            />
          </div>

          <div
            className="row row-3col"
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            <section className="panel">
              <div className="panel-head">
                <h2>
                  <Icon name="barChart" size={16} /> Status
                </h2>
              </div>
              <Bars items={report.charts.status} />
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>
                  <Icon name="barChart" size={16} /> Company Size
                </h2>
              </div>
              <Bars items={report.charts.size} />
            </section>
          </div>

          <div
            className="row row-3col"
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            <section className="panel">
              <div className="panel-head">
                <h2>
                  <Icon name="barChart" size={16} /> Top Companies by Employees
                </h2>
              </div>
              <Bars items={report.charts.topByEmployees} />
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>
                  <Icon name="activity" size={16} /> New Companies by Month
                </h2>
              </div>
              <MonthlyBars data={report.charts.monthly} />
            </section>
          </div>

          <section className="panel">
            <div className="panel-head">
              <h2>
                <Icon name="userPlus" size={16} /> Recently Added Companies
              </h2>
              <span className="muted" style={{ fontSize: 12.5 }}>
                {k.joinedInPeriod} employees joined · {k.leftInPeriod} left in
                period
              </span>
            </div>
            {report.recentCompanies.length === 0 ? (
              <p className="muted">No new companies in this period.</p>
            ) : (
              report.recentCompanies.map((c) => (
                <div
                  key={c.id}
                  className="company-cell"
                  style={{ marginBottom: 10 }}
                >
                  <Avatar name={c.name} src={c.logo} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {fmtDate(c.createdAt)} · {c.employees} employees
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Company Directory</h2>
                <p>{p.total} companies match the filters.</p>
              </div>
              <div className="panel-tools">
                <div className="search-box">
                  <Icon name="search" size={16} />
                  <input
                    type="text"
                    placeholder="Search name or email..."
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
                      Company{arrow("name")}
                    </th>
                    <th>Status</th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleSort("createdAt")}
                    >
                      Created{arrow("createdAt")}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleSort("users")}
                    >
                      Users{arrow("users")}
                    </th>
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleSort("employees")}
                    >
                      Employees{arrow("employees")}
                    </th>
                    <th>Active</th>
                    <th>Joined</th>
                    <th>Left</th>
                  </tr>
                </thead>
                <tbody>
                  {dir.data.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="muted"
                        style={{ textAlign: "center", padding: 24 }}
                      >
                        No companies found.
                      </td>
                    </tr>
                  )}
                  {dir.data.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="company-cell">
                          <Avatar name={c.name} src={c.logo} />
                          <div>
                            <div style={{ fontWeight: 500 }}>{c.name}</div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {c.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${c.status === "active" ? "success" : "warning"}`}
                        >
                          {c.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{fmtDate(c.createdAt)}</td>
                      <td>{c.users}</td>
                      <td>{c.employees}</td>
                      <td>{c.activeEmployees}</td>
                      <td>{c.joinedInPeriod}</td>
                      <td>{c.leftInPeriod}</td>
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
