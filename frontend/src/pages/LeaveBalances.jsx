import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import LeaveBalanceModal from "../components/LeaveBalanceModal";
import { FILE_BASE } from "../config";
import { getLeaveBalances } from "../services/leaveBalanceService";
import { getCurrentUser } from "../utils/auth";

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

// Everything comes from the list response.
const view = (r) => {
  const emp = r.employee || null;
  const used = r.used || 0;
  const remaining = r.remaining || 0;
  const pending = r.pendingDays || 0;
  return {
    employee: r.employeeName || emp?.name || "-",
    email: emp?.email || "",
    department: emp?.department || "",
    designation: emp?.designation || "",
    profileImage: r.profileImage || emp?.profileImage || null,
    leaveType: r.leaveTypeName || "-",
    allocated: r.allocated ?? r.annualQuota ?? used + remaining,
    used,
    pending,
    remaining,
    available: r.availableDays ?? remaining - pending,
  };
};

export default function LeaveBalances() {
  const role = getCurrentUser()?.role || "";
  const staff = role === "staff";
  // Balances are created and updated automatically. Admin/HR can only
  // adjust one (for example a manual correction).
  const canAdjust = role === "admin" || role === "hr" || role === "super_admin";

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [selected, setSelected] = useState(null);

  const fetchRows = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = yearFilter
        ? [{ field: "year", operator: "eq", value: Number(yearFilter) }]
        : [];
      const result = await getLeaveBalances({
        page,
        limit: 20,
        sort: "DESC",
        sort_field: "year",
        fields,
      });
      setRows(result.data.data.data || []);
      setPagination(
        result.data.data.pagination || {
          page,
          limit: 20,
          total: 0,
          total_pages: 1,
        },
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load leave balances",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearFilter]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows
      .map((r) => ({ r, v: view(r) }))
      .filter(({ v }) => {
        if (!q) return true;
        return (
          v.employee.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.department.toLowerCase().includes(q) ||
          v.leaveType.toLowerCase().includes(q)
        );
      });
  }, [rows, search]);

  const totalUsed = rows.reduce((n, r) => n + (r.used || 0), 0);
  const totalPending = rows.reduce((n, r) => n + (r.pendingDays || 0), 0);
  const totalRemaining = rows.reduce((n, r) => n + (r.remaining || 0), 0);

  const selectedView = selected ? view(selected) : null;

  const from = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span>Leave Management</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Leave Balances</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Leave Balances</h1>
          <p>
            {staff
              ? "Your leave balances by type and year. They update automatically when your leave is approved."
              : "Balances are created automatically for every employee and leave type, and update when leave is approved."}
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="calendar"
          label="Records (this page)"
          value={pagination.total}
        />
        <StatCard
          tone="orange"
          icon="clock"
          label="Used Days (this page)"
          value={totalUsed}
        />
        <StatCard
          tone="purple"
          icon="list"
          label="Pending Days (this page)"
          value={totalPending}
        />
        <StatCard
          tone="green"
          icon="userCheck"
          label="Remaining Days (this page)"
          value={totalRemaining}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Leave Balances</h2>
            <p>
              {staff
                ? "Your balances."
                : "All employee leave balances visible to your role."}
            </p>
          </div>
          <div className="panel-tools">
            {!staff && (
              <div className="search-box">
                <Icon name="search" size={16} />
                <input
                  type="text"
                  placeholder="Search employee, leave type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
            <select
              className="lang-btn"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              aria-label="Filter by year"
            >
              <option value="">Filter: All years</option>
              {Array.from(
                { length: 5 },
                (_, i) => new Date().getFullYear() - i,
              ).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading leave balances...
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
                    {!staff && <th>Employee</th>}
                    <th>Leave Type</th>
                    <th>Year</th>
                    <th>Allocated</th>
                    <th>Used</th>
                    <th>Pending</th>
                    <th>Remaining</th>
                    <th>Available</th>
                    {canAdjust && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={(staff ? 8 : 9) + (canAdjust ? 1 : 0)}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No leave balances found.
                      </td>
                    </tr>
                  )}
                  {filtered.map(({ r, v }, i) => {
                    const sub = [v.department, v.designation]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <tr key={r._id}>
                        <td>{from + i}</td>
                        {!staff && (
                          <td>
                            <div className="company-cell">
                              <PersonAvatar
                                key={v.profileImage || r._id}
                                name={v.employee}
                                profileImage={v.profileImage}
                                color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                              />
                              <div>
                                <div style={{ fontWeight: 500 }}>
                                  {v.employee}
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
                        )}
                        <td>{v.leaveType}</td>
                        <td>{r.year}</td>
                        <td>{v.allocated}</td>
                        <td>{v.used}</td>
                        <td>{v.pending}</td>
                        <td>{v.remaining}</td>
                        <td>
                          <span
                            className={`badge ${v.available > 0 ? "success" : "warning"}`}
                          >
                            {v.available}
                          </span>
                        </td>
                        {canAdjust && (
                          <td>
                            <button
                              className="btn btn-sm"
                              onClick={() => setSelected(r)}
                            >
                              <Icon name="edit" size={13} /> Adjust
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} balances
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchRows(pagination.page - 1)}
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
                    onClick={() => fetchRows(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchRows(pagination.page + 1)}
                  aria-label="Next page"
                >
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {selected && canAdjust && (
        <LeaveBalanceModal
          mode="edit"
          balance={selected}
          employeeName={selectedView.employee}
          leaveTypeName={selectedView.leaveType}
          onClose={() => setSelected(null)}
          onSaved={() => fetchRows(pagination.page)}
        />
      )}
    </>
  );
}
