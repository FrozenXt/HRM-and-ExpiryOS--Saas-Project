import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  getPerformanceReviews,
  deletePerformanceReview,
} from "../services/performanceReviewService";
import { Icon } from "../components/Icon";
import { getCurrentUser } from "../utils/auth";
import PerformanceReviewFormModal from "../components/PerformanceReviewFormModal";
import { employeeName } from "../utils/performanceReviewUtils";

const PIE_COLORS = ["#f59e0b", "#10b981", "#64748b"];
const BAR_COLOR = "#3b82f6";
const LINE_COLOR = "#7c3aed";

const MANAGER_ROLES = ["super_admin", "admin", "hr"];

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

const Stars = ({ value }) => (
  <span title={`${value} / 5`} style={{ color: "#f59e0b", letterSpacing: 1 }}>
    {"★".repeat(value)}
    <span style={{ color: "var(--border)" }}>{"★".repeat(5 - value)}</span>
  </span>
);

function StatCard({ tone, icon, label, value, trend }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon name={icon} size={24} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {trend && <div className="stat-trend">{trend}</div>}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="panel" style={{ flex: 1, minWidth: 320 }}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <div style={{ width: "100%", height: 260 }}>{children}</div>
    </section>
  );
}

const Empty = () => (
  <div
    className="muted"
    style={{ height: "100%", display: "grid", placeItems: "center" }}
  >
    No data yet
  </div>
);

const tooltipStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

export default function PerformanceReviews() {
  const canManage = MANAGER_ROLES.includes(getCurrentUser()?.role);

  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [modalMode, setModalMode] = useState(null); // "create" | "edit" | null
  const [selected, setSelected] = useState(null);
  const [viewing, setViewing] = useState(null);

  const fetchReviews = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const fields = [];
      if (statusFilter !== "all") {
        fields.push({ field: "status", operator: "eq", value: statusFilter });
      }
      if (periodFilter !== "all") {
        fields.push({
          field: "reviewPeriod",
          operator: "eq",
          value: periodFilter,
        });
      }

      const result = await getPerformanceReviews({
        page,
        limit: 20,
        sort: "DESC",
        sort_field: "reviewPeriod",
        fields,
      });

      setReviews(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, periodFilter]);

  const handleDelete = async (r) => {
    if (!window.confirm(`Delete review for ${employeeName(r.employeeId)}?`))
      return;
    try {
      await deletePerformanceReview(r._id);
      fetchReviews(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const filtered = reviews.filter((r) => {
    const q = search.toLowerCase();
    return (
      employeeName(r.employeeId).toLowerCase().includes(q) ||
      r.employeeId?.departmentId?.name?.toLowerCase().includes(q) ||
      r.reviewPeriod?.toLowerCase().includes(q)
    );
  });

  /* ---------- derived stats & chart data (from the loaded page) ---------- */
  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total
      ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / total
      : 0;
    const submitted = reviews.filter((r) => r.status === "submitted").length;
    const drafts = reviews.filter((r) => r.status === "draft").length;
    const topPerformers = reviews.filter((r) => r.rating >= 4).length;

    const distribution = [1, 2, 3, 4, 5].map((n) => ({
      rating: `${n} ★`,
      count: reviews.filter((r) => r.rating === n).length,
    }));

    const deptMap = {};
    reviews.forEach((r) => {
      const d = r.employeeId?.departmentId?.name || "Unassigned";
      deptMap[d] = deptMap[d] || { sum: 0, n: 0 };
      deptMap[d].sum += r.rating || 0;
      deptMap[d].n += 1;
    });
    const byDepartment = Object.entries(deptMap).map(([name, v]) => ({
      name,
      avg: Number((v.sum / v.n).toFixed(2)),
    }));

    const periodMap = {};
    reviews.forEach((r) => {
      periodMap[r.reviewPeriod] = periodMap[r.reviewPeriod] || { sum: 0, n: 0 };
      periodMap[r.reviewPeriod].sum += r.rating || 0;
      periodMap[r.reviewPeriod].n += 1;
    });
    const trend = Object.entries(periodMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, v]) => ({
        period,
        avg: Number((v.sum / v.n).toFixed(2)),
      }));

    const statusData = [
      { name: "Draft", value: drafts },
      { name: "Submitted", value: submitted },
    ].filter((s) => s.value > 0);

    const periods = [...new Set(reviews.map((r) => r.reviewPeriod))];

    return {
      total,
      avg,
      submitted,
      drafts,
      topPerformers,
      distribution,
      byDepartment,
      trend,
      statusData,
      periods,
    };
  }, [reviews]);

  const openCreate = () => {
    setSelected(null);
    setModalMode("create");
  };
  const openEdit = (r) => {
    setSelected(r);
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
        <span className="current">Performance Reviews</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Performance Reviews</h1>
          <p>
            {canManage
              ? "Create, track and analyse employee performance reviews across review periods."
              : "View your performance review. Reviews are read-only for staff."}
          </p>
        </div>
        {canManage && (
          <button className="btn primary" onClick={openCreate}>
            <Icon name="plusCircle" size={17} />
            New Review
          </button>
        )}
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="clock"
          label="Total Reviews"
          value={pagination.total}
        />
        <StatCard
          tone="green"
          icon="users"
          label="Average Rating"
          value={stats.total ? stats.avg.toFixed(2) : "—"}
          trend={stats.total ? "out of 5" : undefined}
        />
        <StatCard
          tone="purple"
          icon="building"
          label="Submitted"
          value={stats.submitted}
          trend={`${stats.drafts} in draft`}
        />
        <StatCard
          tone="orange"
          icon="dollar"
          label="Top Performers (4★+)"
          value={stats.topPerformers}
        />
      </div>

      {/* ---------------- Charts ---------------- */}
      <div
        style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}
      >
        <ChartCard
          title="Rating Distribution"
          subtitle="How many reviews received each rating"
        >
          {stats.total ? (
            <ResponsiveContainer>
              <BarChart data={stats.distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="rating"
                  stroke="var(--text-dim)"
                  fontSize={12}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="var(--text-dim)"
                  fontSize={12}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="count"
                  name="Reviews"
                  fill={BAR_COLOR}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>

        <ChartCard
          title="Average Rating by Department"
          subtitle="Mean rating per department"
        >
          {stats.byDepartment.length ? (
            <ResponsiveContainer>
              <BarChart data={stats.byDepartment}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={12} />
                <YAxis domain={[0, 5]} stroke="var(--text-dim)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="avg"
                  name="Avg rating"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>
      </div>

      <div
        style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}
      >
        <ChartCard
          title="Rating Trend by Period"
          subtitle="Average rating over review periods"
        >
          {stats.trend.length ? (
            <ResponsiveContainer>
              <LineChart data={stats.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="period"
                  stroke="var(--text-dim)"
                  fontSize={12}
                />
                <YAxis domain={[0, 5]} stroke="var(--text-dim)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="avg"
                  name="Avg rating"
                  stroke={LINE_COLOR}
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>

        <ChartCard title="Review Status" subtitle="Draft vs submitted reviews">
          {stats.statusData.length ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={stats.statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {stats.statusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>
      </div>

      {/* ---------------- Table ---------------- */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Reviews</h2>
            <p>
              {canManage
                ? "All performance reviews in your company."
                : "Your performance review."}
            </p>
          </div>

          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search employee, department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="lang-btn"
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              aria-label="Filter by period"
            >
              <option value="all">Period: All</option>
              {stats.periods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              className="lang-btn"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">Status: All</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading reviews...
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
                    <th>Department</th>
                    <th>Period</th>
                    <th>Reviewer</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No reviews found. Try a different search or filter.
                      </td>
                    </tr>
                  )}
                  {filtered.map((r, i) => (
                    <tr key={r._id}>
                      <td>{from + i}</td>
                      <td>
                        <div>{employeeName(r.employeeId)}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {r.employeeId?.designationId?.name || ""}
                        </div>
                      </td>
                      <td>{r.employeeId?.departmentId?.name || "-"}</td>
                      <td>{r.reviewPeriod}</td>
                      <td>
                        {r.reviewerId
                          ? `${r.reviewerId.firstName || ""} ${r.reviewerId.lastName || ""}`.trim()
                          : "-"}
                      </td>
                      <td>
                        <Stars value={r.rating || 0} />
                      </td>
                      <td>
                        <span
                          className={`badge ${r.status === "submitted" ? "success" : "warning"}`}
                        >
                          {r.status === "submitted" ? "Submitted" : "Draft"}
                        </span>
                      </td>
                      <td>{formatDate(r.createdAt)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => setViewing(r)}
                          >
                            <Icon name="eye" size={14} /> View
                          </button>
                          {canManage && (
                            <>
                              <button
                                className="btn btn-sm"
                                onClick={() => openEdit(r)}
                              >
                                <Icon name="edit" size={13} /> Edit
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(r)}
                              >
                                <Icon name="trash" size={14} /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} reviews
              </span>

              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchReviews(pagination.page - 1)}
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
                    onClick={() => fetchReviews(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchReviews(pagination.page + 1)}
                  aria-label="Next page"
                >
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ---------------- View (read-only) modal ---------------- */}
      {viewing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
          onClick={() => setViewing(null)}
        >
          <div
            className="panel"
            style={{
              width: 520,
              maxWidth: "95vw",
              maxHeight: "88vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-head">
              <h2>
                {employeeName(viewing.employeeId)} — {viewing.reviewPeriod}
              </h2>
              <button
                type="button"
                className="more-btn"
                onClick={() => setViewing(null)}
                aria-label="Close"
              >
                <Icon
                  name="chevronRight"
                  size={16}
                  style={{ transform: "rotate(45deg)" }}
                />
              </button>
            </div>
            <div style={{ display: "grid", gap: 14, fontSize: 14 }}>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Rating
                </div>
                <Stars value={viewing.rating || 0} />
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Strengths
                </div>
                <div>{viewing.strengths || "-"}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Areas of Improvement
                </div>
                <div>{viewing.areasOfImprovement || "-"}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Submitted
                </div>
                <div>{formatDate(viewing.submittedAt)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalMode && (
        <PerformanceReviewFormModal
          mode={modalMode}
          review={selected}
          onClose={closeModal}
          onSaved={() => fetchReviews(pagination.page)}
        />
      )}
    </>
  );
}
