import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { isSuperAdmin, getCurrentUser } from "../utils/auth";
import StatCard from "../components/StatCard";
import TimeLogFormModal from "../components/TimeLogFormModal";
import { listOptions } from "../services/employeeService";
import {
  getTimeLogs,
  deleteTimeLog,
  submitTimeLog,
  reviewTimeLog,
} from "../services/timeLogService";

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const byId = (rows) => Object.fromEntries(rows.map((r) => [r._id, r]));

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

const statusBadge = {
  draft: "warning",
  submitted: "plan-default",
  approved: "success",
  rejected: "plan-business",
};

export default function TimeLogs() {
  const superAdmin = isSuperAdmin();
  const me = getCurrentUser();
  const isStaff = me?.role === "staff";
  const canReview = me?.role === "admin" || me?.role === "hr" || superAdmin;

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [lookups, setLookups] = useState({ users: {}, employees: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalMode, setModalMode] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadLookups = async () => {
    try {
      const [users, employees] = (
        await Promise.allSettled([
          listOptions("users"),
          listOptions("employees"),
        ])
      ).map((r) => (r.status === "fulfilled" ? r.value : []));
      setLookups({ users: byId(users), employees: byId(employees) });
    } catch {
      /* names just fall back to "-" */
    }
  };

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = [];
      if (statusFilter !== "all") {
        fields.push({ field: "status", operator: "eq", value: statusFilter });
      }
      const result = await getTimeLogs({ page, limit: 20, fields });
      setLogs(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const view = (log) => {
    const employee =
      typeof log.employeeId === "object"
        ? log.employeeId
        : lookups.employees[log.employeeId];
    const user =
      typeof employee?.userId === "object"
        ? employee.userId
        : lookups.users[employee?.userId];
    return { employeeName: fullName(user) || "-" };
  };

  const rows = useMemo(
    () => logs.map((l) => ({ l, v: view(l) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logs, lookups],
  );

  const filtered = rows.filter(({ l, v }) => {
    const q = search.toLowerCase();
    return (
      v.employeeName.toLowerCase().includes(q) ||
      l.taskDescription?.toLowerCase().includes(q)
    );
  });

  const draftCount = logs.filter((l) => l.status === "draft").length;
  const submittedCount = logs.filter((l) => l.status === "submitted").length;
  const totalHours = logs.reduce(
    (sum, l) => sum + (Number(l.hoursWorked) || 0),
    0,
  );

  const openCreate = () => {
    setSelected(null);
    setModalMode("create");
  };
  const openEdit = (l) => {
    setSelected(l);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
  };

  const handleDelete = async (l, name) => {
    if (
      !window.confirm(
        `Delete the draft time log for ${name} on ${formatDate(l.date)}?`,
      )
    )
      return;
    try {
      await deleteTimeLog(l._id);
      fetchLogs(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const handleSubmit = async (l) => {
    try {
      setBusyId(l._id);
      await submitTimeLog(l._id);
      fetchLogs(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleReview = async (l, status) => {
    if (
      !window.confirm(
        `${status === "approved" ? "Approve" : "Reject"} this time log?`,
      )
    )
      return;
    try {
      setBusyId(l._id);
      await reviewTimeLog(l._id, status);
      fetchLogs(pagination.page);
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
        <span>Payroll</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Time Logs</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Time Logs</h1>
          <p>
            Track hours worked per day.
            {isStaff && " You'll see your own logs only."}
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          Log Time
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="clock"
          label="Total Records"
          value={pagination.total}
        />
        <StatCard
          tone="orange"
          icon="edit"
          label="Drafts (this page)"
          value={draftCount}
        />
        <StatCard
          tone="purple"
          icon="chevronRight"
          label="Submitted (this page)"
          value={submittedCount}
        />
        <StatCard
          tone="green"
          icon="dollar"
          label="Total Hours (this page)"
          value={totalHours}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Time Log Records</h2>
            <p>A list of all time logs visible to your role.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search by employee or task..."
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
              <option value="all">Filter: All statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading time logs...
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
                    <th>Date</th>
                    <th>Hours</th>
                    <th>Overtime</th>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No time logs found. Log some time or change the filter.
                      </td>
                    </tr>
                  )}
                  {filtered.map(({ l, v }, i) => (
                    <tr key={l._id}>
                      <td>{l.id_int ?? from + i}</td>
                      <td>{v.employeeName}</td>
                      <td>{formatDate(l.date)}</td>
                      <td>{l.hoursWorked}</td>
                      <td>{l.overtimeHours || 0}</td>
                      <td
                        style={{
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={l.taskDescription}
                      >
                        {l.taskDescription || "-"}
                      </td>
                      <td>
                        <span
                          className={`badge ${statusBadge[l.status] || "warning"}`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                        >
                          {l.status === "draft" && (
                            <>
                              <button
                                className="btn btn-sm"
                                onClick={() => openEdit(l)}
                              >
                                <Icon name="edit" size={13} /> Edit
                              </button>
                              <button
                                className="btn btn-sm primary"
                                disabled={busyId === l._id}
                                onClick={() => handleSubmit(l)}
                              >
                                <Icon name="chevronRight" size={13} /> Submit
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(l, v.employeeName)}
                              >
                                <Icon name="trash" size={14} /> Delete
                              </button>
                            </>
                          )}
                          {l.status === "submitted" && canReview && (
                            <>
                              <button
                                className="btn btn-sm primary"
                                disabled={busyId === l._id}
                                onClick={() => handleReview(l, "approved")}
                              >
                                <Icon name="check" size={13} /> Approve
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                disabled={busyId === l._id}
                                onClick={() => handleReview(l, "rejected")}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {l.status === "submitted" && !canReview && (
                            <span className="muted" style={{ fontSize: 12.5 }}>
                              Awaiting review
                            </span>
                          )}
                          {(l.status === "approved" ||
                            l.status === "rejected") && (
                            <span className="muted" style={{ fontSize: 12.5 }}>
                              Finalized
                            </span>
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
                Showing {from}–{to} of {pagination.total} records
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchLogs(pagination.page - 1)}
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
                    onClick={() => fetchLogs(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchLogs(pagination.page + 1)}
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
        <TimeLogFormModal
          mode={modalMode}
          timeLog={selected}
          onClose={closeModal}
          onSaved={() => fetchLogs(pagination.page)}
        />
      )}
    </>
  );
}
