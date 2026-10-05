import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import RegularizationRequestFormModal from "../components/RegularizationRequestFormModal";
import { FILE_BASE } from "../config";
import { getCurrentUser } from "../utils/auth";
import {
  getRegularizationRequests,
  reviewRegularizationRequest,
} from "../services/regularizationService";

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

const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

const formatTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "-";

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const statusBadge = {
  pending: "warning",
  approved: "success",
  rejected: "plan-business",
};

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
  return {
    name: r.employeeName || emp?.name || "-",
    email: emp?.email || "",
    department: emp?.department || "",
    designation: emp?.designation || "",
    profileImage: r.profileImage || emp?.profileImage || null,
  };
};

export default function RegularizationRequests() {
  const role = getCurrentUser()?.role;
  const isStaff = role === "staff";
  const canReview = ["super_admin", "admin", "hr"].includes(role);

  const [rows, setRows] = useState([]);
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
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const fetchRows = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = [];
      if (statusFilter !== "all")
        fields.push({ field: "status", operator: "eq", value: statusFilter });
      const result = await getRegularizationRequests({
        page,
        limit: 20,
        fields,
      });
      setRows(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows
      .map((r) => ({ r, v: view(r) }))
      .filter(
        ({ r, v }) =>
          !q ||
          v.name.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.department.toLowerCase().includes(q) ||
          (r.reason || "").toLowerCase().includes(q),
      );
  }, [rows, search]);

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  const handleReview = async (r, status) => {
    if (
      !window.confirm(
        `${status === "approved" ? "Approve" : "Reject"} this regularization request?`,
      )
    )
      return;
    try {
      setBusyId(r._id);
      setError("");
      await reviewRegularizationRequest(r._id, status);
      fetchRows(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
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
        <span>Attendance</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Regularization Requests</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Regularization Requests</h1>
          <p>
            {isStaff
              ? "Request a correction to your attendance record."
              : "Review attendance correction requests submitted by employees."}
          </p>
        </div>
        {isStaff && (
          <button className="btn primary" onClick={() => setModalOpen(true)}>
            <Icon name="plusCircle" size={17} />
            Request Correction
          </button>
        )}
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="edit"
          label="Total Records"
          value={pagination.total}
        />
        <StatCard
          tone="orange"
          icon="clock"
          label="Pending (this page)"
          value={pendingCount}
        />
        <StatCard
          tone="green"
          icon="check"
          label="Reviewed (this page)"
          value={rows.length - pendingCount}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Requests</h2>
            <p>
              {isStaff
                ? "Your submitted requests."
                : "All requests visible to your role."}
            </p>
          </div>
          <div className="panel-tools">
            {!isStaff && (
              <div className="search-box">
                <Icon name="search" size={16} />
                <input
                  type="text"
                  placeholder="Search by employee or reason..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
            <select
              className="lang-btn"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">Filter: All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading requests...
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
                    {!isStaff && <th>Employee</th>}
                    <th>Attendance Date</th>
                    <th>Reason</th>
                    <th>Requested Check-In</th>
                    <th>Requested Check-Out</th>
                    <th>Status</th>
                    {canReview && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={6 + (isStaff ? 0 : 1) + (canReview ? 1 : 0)}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No regularization requests found.
                      </td>
                    </tr>
                  )}
                  {filtered.map(({ r, v }, i) => {
                    const sub = [v.department, v.designation]
                      .filter(Boolean)
                      .join(" · ");
                    const att = r.attendance;
                    return (
                      <tr key={r._id}>
                        <td>{r.id_int ?? from + i}</td>

                        {!isStaff && (
                          <td>
                            <div className="company-cell">
                              <PersonAvatar
                                key={v.profileImage || r._id}
                                name={v.name}
                                profileImage={v.profileImage}
                                color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                              />
                              <div>
                                <div style={{ fontWeight: 500 }}>{v.name}</div>
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

                        <td>
                          <div>{formatDate(att?.date)}</div>
                          {att && (
                            <div
                              className="muted"
                              style={{ fontSize: 12, fontWeight: 400 }}
                            >
                              Original: {formatTime(att.checkIn)} –{" "}
                              {formatTime(att.checkOut)}
                            </div>
                          )}
                        </td>

                        <td
                          style={{
                            maxWidth: 220,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={r.reason}
                        >
                          {r.reason}
                        </td>

                        <td>{formatDateTime(r.requestedCheckIn)}</td>
                        <td>{formatDateTime(r.requestedCheckOut)}</td>

                        <td>
                          <span
                            className={`badge ${statusBadge[r.status] || "warning"}`}
                          >
                            {r.status?.[0]?.toUpperCase() + r.status?.slice(1)}
                          </span>
                          {r.approvedByName && (
                            <div
                              className="muted"
                              style={{ fontSize: 11.5, marginTop: 4 }}
                            >
                              by {r.approvedByName}
                            </div>
                          )}
                        </td>

                        {canReview && (
                          <td>
                            {r.status === "pending" ? (
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  flexWrap: "wrap",
                                }}
                              >
                                <button
                                  className="btn btn-sm primary"
                                  disabled={busyId === r._id}
                                  onClick={() => handleReview(r, "approved")}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  disabled={busyId === r._id}
                                  onClick={() => handleReview(r, "rejected")}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span
                                className="muted"
                                style={{ fontSize: 12.5 }}
                              >
                                Reviewed
                              </span>
                            )}
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
                Showing {from}–{to} of {pagination.total} requests
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

      {modalOpen && (
        <RegularizationRequestFormModal
          onClose={() => setModalOpen(false)}
          onSaved={() => fetchRows(pagination.page)}
        />
      )}
    </>
  );
}
