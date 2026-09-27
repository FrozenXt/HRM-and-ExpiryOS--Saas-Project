import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import LeaveRequestFormModal from "../components/LeaveRequestFormModal";
import {
  getLeaveRequests,
  deleteLeaveRequest,
  updateLeaveRequestStatus,
} from "../services/leaveRequestService";
import { listOptions } from "../services/employeeService";
import { getCurrentUser } from "../utils/auth";

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";
const days = (from, to) =>
  from && to ? Math.round((new Date(to) - new Date(from)) / 86400000) + 1 : "-";

const STATUS_BADGE = {
  pending: "plan-business",
  approved: "success",
  rejected: "warning",
  cancelled: "plan-default",
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
  const [names, setNames] = useState({
    employees: {},
    users: {},
    leaveTypes: {},
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

  // Names for ids (records only store ids).
  useEffect(() => {
    if (staff) return;
    Promise.allSettled([
      listOptions("employees"),
      listOptions("users"),
      listOptions("leave-types"),
    ]).then(([e, u, l]) => {
      setNames({
        employees: Object.fromEntries(
          (e.status === "fulfilled" ? e.value : []).map((x) => [x._id, x]),
        ),
        users: Object.fromEntries(
          (u.status === "fulfilled" ? u.value : []).map((x) => [x._id, x]),
        ),
        leaveTypes: Object.fromEntries(
          (l.status === "fulfilled" ? l.value : []).map((x) => [x._id, x]),
        ),
      });
    });
  }, [staff]);

  const view = (r) => {
    const emp =
      typeof r.employeeId === "object"
        ? r.employeeId
        : names.employees[idOf(r.employeeId)];
    const user =
      typeof emp?.userId === "object"
        ? emp.userId
        : names.users[idOf(emp?.userId)];
    const lt =
      typeof r.leaveTypeId === "object"
        ? r.leaveTypeId
        : names.leaveTypes[idOf(r.leaveTypeId)];
    return { employee: fullName(user) || "-", leaveType: lt?.name || "-" };
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows
      .map((r) => ({ r, v: view(r) }))
      .filter(({ r, v }) => {
        if (!q) return true;
        return (
          v.employee.toLowerCase().includes(q) ||
          v.leaveType.toLowerCase().includes(q) ||
          (r.reason || "").toLowerCase().includes(q)
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, names, search]);

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
                    return (
                      <tr key={r._id}>
                        <td>{from + i}</td>
                        {!staff && (
                          <td style={{ fontWeight: 500 }}>{v.employee}</td>
                        )}
                        <td>{v.leaveType}</td>
                        <td>{fmtDate(r.fromDate)}</td>
                        <td>{fmtDate(r.toDate)}</td>
                        <td>{days(r.fromDate, r.toDate)}</td>
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
