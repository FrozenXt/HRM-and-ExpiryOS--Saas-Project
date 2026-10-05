import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { isSuperAdmin } from "../utils/auth";
import StatCard from "../components/StatCard";
import SalaryFormModal from "../components/SalaryFormModal";
import { FILE_BASE } from "../config";
import { listOptions } from "../services/employeeService";
import {
  getSalaryStructures,
  deleteSalaryStructure,
} from "../services/salaryService";

const AVATAR_COLORS = [
  "#3b82f6",
  "#10b981",
  "#0ea5e9",
  "#f97316",
  "#14b8a6",
  "#ec4899",
  "#22c55e",
  "#64748b",
  "#7c3aed",
  "#06b6d4",
];

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const byId = (rows) => Object.fromEntries(rows.map((r) => [r._id, r]));

const wageTypeLabel = (w) => (w ? w[0].toUpperCase() + w.slice(1) : "-");

const money = (amount, symbol) =>
  `${symbol || ""}${Number(amount || 0).toLocaleString()}`;

const sum = (items) =>
  (items || []).reduce((n, i) => n + (Number(i?.amount) || 0), 0);

// Uses the totals from the API, falling back to computing them.
const netPay = (s) =>
  (s.basic || 0) +
  (s.totalAllowances ?? sum(s.allowances)) -
  (s.totalDeductions ?? sum(s.deductions));

// Photo if there is one, otherwise coloured initials. Falls back to the
// initials if the image fails to load.
function PersonAvatar({ name, profileImage, color, size = 34 }) {
  const [failed, setFailed] = useState(false);

  if (profileImage && !failed) {
    return (
      <img
        src={`${FILE_BASE}${profileImage}`}
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
      style={{ background: color, borderRadius: "50%" }}
    >
      {initials(name)}
    </span>
  );
}

export default function SalaryStructures() {
  const superAdmin = isSuperAdmin();
  const [structures, setStructures] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [companies, setCompanies] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [wageFilter, setWageFilter] = useState("all");
  const [modalMode, setModalMode] = useState(null); // "create" | "edit" | null
  const [selected, setSelected] = useState(null);

  // Only a super admin sees the Company column, so only they need this.
  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then((rows) => setCompanies(byId(rows)))
      .catch(() => {});
  }, [superAdmin]);

  const fetchStructures = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const fields = [];
      if (wageFilter !== "all") {
        fields.push({ field: "wageType", operator: "eq", value: wageFilter });
      }

      const result = await getSalaryStructures({ page, limit: 20, fields });
      setStructures(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wageFilter]);

  // Everything comes from the list response; only the company name needs
  // the (super admin) lookup.
  const view = (s) => {
    const emp = s.employee || null;
    const company =
      typeof s.companyId === "object" ? s.companyId : companies[s.companyId];
    const code = s.currency?.code || "";
    return {
      employeeName: s.employeeName || emp?.name || "-",
      email: emp?.email || "",
      department: emp?.department || "",
      designation: emp?.designation || "",
      profileImage: s.profileImage || emp?.profileImage || null,
      company: company?.legalName || "-",
      currencyCode: code || "-",
      currencySymbol: s.currency?.symbol || (code ? `${code} ` : ""),
    };
  };

  const rows = useMemo(
    () => structures.map((s) => ({ s, v: view(s) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [structures, companies],
  );

  const filtered = rows.filter(({ v }) => {
    const q = search.toLowerCase();
    return (
      v.employeeName.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      v.department.toLowerCase().includes(q) ||
      v.company.toLowerCase().includes(q) ||
      v.currencyCode.toLowerCase().includes(q)
    );
  });

  const hourlyCount = structures.filter((s) => s.wageType === "hourly").length;
  const monthlyCount = structures.filter(
    (s) => s.wageType === "monthly",
  ).length;

  const handleDelete = async (structure, name) => {
    if (
      !window.confirm(
        `Delete the salary structure for ${name}? This cannot be undone.`,
      )
    )
      return;
    try {
      await deleteSalaryStructure(structure._id);
      fetchStructures(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const openCreate = () => {
    setSelected(null);
    setModalMode("create");
  };
  const openEdit = (structure) => {
    setSelected(structure);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
  };

  const from = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span>HR Management</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Salary Structures</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Salary Structures</h1>
          <p>
            Manage pay rates, allowances and deductions for each employee.
            {!superAdmin && " You'll see structures for your company only."}
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          Add Structure
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="dollar"
          label="Total Structures"
          value={pagination.total}
        />
        <StatCard
          tone="green"
          icon="clock"
          label="Hourly (this page)"
          value={hourlyCount}
        />
        <StatCard
          tone="orange"
          icon="users"
          label="Monthly (this page)"
          value={monthlyCount}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Salary Structures</h2>
            <p>A list of all salary structures visible to your role.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search by employee, department or currency..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="lang-btn"
              value={wageFilter}
              onChange={(e) => setWageFilter(e.target.value)}
              aria-label="Filter by wage type"
            >
              <option value="all">Filter: All wage types</option>
              <option value="monthly">Monthly</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading salary structures...
          </div>
        ) : error ? (
          <div style={{ color: "var(--red)", padding: "24px 0" }}>{error}</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee</th>
                    {superAdmin && <th>Company</th>}
                    <th>Wage Type</th>
                    <th>Pay Frequency</th>
                    <th>Basic</th>
                    <th>Allowances</th>
                    <th>Deductions</th>
                    <th>Net Pay</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={superAdmin ? 10 : 9}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No salary structures found. Add one or change the
                        filter.
                      </td>
                    </tr>
                  )}
                  {filtered.map(({ s, v }, i) => {
                    const sub = [v.department, v.designation]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <tr key={s._id}>
                        <td>{s.id_int ?? from + i}</td>
                        <td>
                          <div className="company-cell">
                            <PersonAvatar
                              key={v.profileImage || s._id}
                              name={v.employeeName}
                              profileImage={v.profileImage}
                              color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                            />
                            <div>
                              <div style={{ fontWeight: 500 }}>
                                {v.employeeName}
                              </div>
                              {(sub || v.email) && (
                                <div
                                  className="muted"
                                  style={{ fontSize: 12, fontWeight: 400 }}
                                >
                                  {sub || v.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        {superAdmin && <td>{v.company}</td>}
                        <td>
                          <span className="badge plan-default">
                            {wageTypeLabel(s.wageType)}
                          </span>
                        </td>
                        <td>{s.payFrequency || "-"}</td>
                        <td>{money(s.basic, v.currencySymbol)}</td>
                        <td>
                          {money(
                            s.totalAllowances ?? sum(s.allowances),
                            v.currencySymbol,
                          )}
                        </td>
                        <td>
                          {money(
                            s.totalDeductions ?? sum(s.deductions),
                            v.currencySymbol,
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {money(netPay(s), v.currencySymbol)}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="btn btn-sm"
                              onClick={() => openEdit(s)}
                            >
                              <Icon name="edit" size={13} /> Edit
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(s, v.employeeName)}
                            >
                              <Icon name="trash" size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} structures
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchStructures(pagination.page - 1)}
                  aria-label="Previous page"
                >
                  <Icon name="chevronLeft" size={14} />
                </button>
                {Array.from(
                  { length: pagination.total_pages || 1 },
                  (_, n) => n + 1,
                ).map((p) => (
                  <button
                    key={p}
                    className={p === pagination.page ? "active" : ""}
                    onClick={() => fetchStructures(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchStructures(pagination.page + 1)}
                  aria-label="Next page"
                >
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {modalMode && (
        <SalaryFormModal
          mode={modalMode}
          structure={selected}
          onClose={closeModal}
          onSaved={() => fetchStructures(pagination.page)}
        />
      )}
    </>
  );
}
