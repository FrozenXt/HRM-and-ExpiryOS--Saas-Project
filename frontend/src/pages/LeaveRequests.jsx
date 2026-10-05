import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import LeaveRequestFormModal from "../components/LeaveRequestFormModal";
import { FILE_BASE } from "../config";
import {
  getLeaveRequests,
  deleteLeaveRequest,
  updateLeaveRequestStatus,
} from "../services/leaveRequestService";
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

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

const daysBetween = (from, to) =>
  from && to ? Math.round((new Date(to) - new Date(from)) / 86400000) + 1 : "-";

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const STATUS_BADGE = {
  pending: "plan-business",
  approved: "success",
  rejected: "warning",
  cancelled: "plan-default",
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

// Everything comes from the list response. The nested populated objects are
// kept as a fallback.
const view = (r) => {
  const emp = typeof r.employeeId === "object" ? r.employeeId : null;
  const user = emp && typeof emp.userId === "object" ? emp.userId : null;
  const fullName = user
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : "";
  return {
    employee: r.employeeName || fullName || "-",
    email: user?.email || "",
    department: r.department || emp?.departmentId?.name || "",
    designation: r.designation || emp?.designationId?.name || "",
    profileImage: r.profileImage || user?.profileImage || null,
    leaveType:
      r.leaveTypeName ||
      (typeof r.leaveTypeId === "object" ? r.leaveTypeId?.name : "") ||
      "-",
    days: r.days ?? daysBetween(r.fromDate, r.toDate),
  };
};

export default function LeaveRequests() {
  const role = getCurrentUser()?.role || "";
  const staff = role === "staff";
  const canReview = role === "admin" || role === "hr" || role === "super_admin"; // approve/reject own company's staff

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
  const [statusFilter, setStatusFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selected, setSelected] = useState(null);
  const [actingId, setActingId] = useState(null);

  const fetchRows = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = statusFilter
        ? [{ field: "status", operator: "eq", value: statusFilter }]
        : [];
      const result = await getLeaveRequests({
        page,
        limit: 20,
        sort: "DESC",
        sort_field: "createdAt",
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
          "Failed to load leave requests",
      );
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
      .filter(({ r, v }) => {
        if (!q) return true;
        return (
          v.employee.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.department.toLowerCase().includes(q) ||
          v.leaveType.toLowerCase().includes(q) ||
          (r.reason || "").toLowerCase().includes(q)
        );
      });
  }, [rows, search]);

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

  const handleDelete = async (r) => {
    if (!window.confirm("Cancel/delete this leave request?")) return;
    try {
      await deleteLeaveRequest(r._id);
      fetchRows(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to delete");
    }
  };

  const handleStatus = async (r, status) => {
    if (
      !window.confirm(
        `${status === "approved" ? "Approve" : "Reject"} this leave request?`,
      )
    )
      return;
    try {
      setActingId(r._id);
      await updateLeaveRequestStatus(r._id, status);
      fetchRows(pagination.page);
    } catch (err) {
      alert(
        err.response?.data?.message || err.message || "Failed to update status",
      );
    } finally {
      setActingId(null);
    }
  };

  const count = (status) => rows.filter((r) => r.status === status).length;
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
        <span className="current">Leave Requests</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Leave Requests</h1>
          <p>
            {staff
              ? "Request leave and track your approvals."
              : "Review and manage leave requests for your company."}
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />{" "}
          {staff ? "Request Leave" : "Add Leave Request"}
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="calendar"
          label="Pending (this page)"
          value={count("pending")}
        />
        <StatCard
          tone="green"
          icon="userCheck"
          label="Approved (this page)"
          value={count("approved")}
        />
        <StatCard
          tone="orange"
          icon="clock"
          label="Rejected (this page)"
          value={count("rejected")}
        />
        <StatCard
          tone="purple"
          icon="list"
          label="Total"
          value={pagination.total}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Leave Requests</h2>
            <p>
              {staff
                ? "Your leave request history."
                : "All leave requests in your company."}
            </p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search employee, leave type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="lang-btn"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">Filter: All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading leave requests...
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
                    <th>From</th>
                    <th>To</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={staff ? 8 : 9}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No leave requests found.
                      </td>
                    </tr>
                  )}
                  {filtered.map(({ r, v }, i) => {
                    const pending = r.status === "pending";
                    // Staff can only change their own pending requests.
                    const canChange = !staff || pending;
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
                        <td>{fmtDate(r.fromDate)}</td>
                        <td>{fmtDate(r.toDate)}</td>
                        <td>{v.days}</td>
                        <td>
                          <span
                            style={{
                              display: "block",
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={r.reason || ""}
                          >
                            {r.reason || "-"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${STATUS_BADGE[r.status] || "plan-default"}`}
                          >
                            {r.status
                              ? r.status[0].toUpperCase() + r.status.slice(1)
                              : "-"}
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
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            {canReview && pending && (
                              <>
                                <button
                                  className="btn btn-sm primary"
                                  disabled={actingId === r._id}
                                  onClick={() => handleStatus(r, "approved")}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  disabled={actingId === r._id}
                                  onClick={() => handleStatus(r, "rejected")}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {canChange && (
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
                                  <Icon name="trash" size={14} />{" "}
                                  {staff ? "Cancel" : "Delete"}
                                </button>
                              </>
                            )}
                            {!canChange && !canReview && (
                              <span
                                className="muted"
                                style={{ fontSize: 12.5 }}
                              >
                                Decided
                              </span>
                            )}
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

      {modalMode && (
        <LeaveRequestFormModal
          mode={modalMode}
          leaveRequest={selected}
          onClose={closeModal}
          onSaved={() => fetchRows(pagination.page)}
        />
      )}
    </>
  );
}
