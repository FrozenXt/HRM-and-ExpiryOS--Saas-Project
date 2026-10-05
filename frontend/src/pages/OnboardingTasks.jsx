import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import OnboardingTaskModal, {
  CATEGORIES,
} from "../components/OnboardingTaskModal";
import useEmployeeLookups from "../hooks/useEmployeeLookups";
import {
  getOnboardingTasks,
  updateOnboardingTask,
  deleteOnboardingTask,
} from "../services/onboardingTaskService";
import { getCurrentUser } from "../utils/auth";

const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";
const catLabel = (v) =>
  CATEGORIES.find((c) => c.value === v)?.label || v || "-";
const isOverdue = (t) =>
  t.status !== "completed" &&
  t.dueDate &&
  new Date(t.dueDate) < new Date(new Date().toDateString());

const STATUS_BADGE = {
  pending: "plan-business",
  in_progress: "plan-pro",
  completed: "success",
};
const STATUS_LABEL = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
};

export default function OnboardingTasks() {
  const role = getCurrentUser()?.role || "";
  const staff = role === "staff";
  const superAdmin = role === "super_admin";
  const canManage = !staff; // create / edit / delete: admin, hr, super admin

  const { employeeName, companyName } = useEmployeeLookups();

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
      const res = await getOnboardingTasks({ page, limit: 20, fields });
      setRows(res.data.data.data || []);
      setPagination(
        res.data.data.pagination || {
          page,
          limit: 20,
          total: 0,
          total_pages: 1,
        },
      );
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to load tasks",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete task "${t.taskName}"?`)) return;
    try {
      await deleteOnboardingTask(t._id);
      fetchRows(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to delete");
    }
  };

  const setStatus = async (t, status) => {
    try {
      setActingId(t._id);
      await updateOnboardingTask(t._id, { status });
      fetchRows(pagination.page);
    } catch (err) {
      alert(
        err.response?.data?.message || err.message || "Failed to update task",
      );
    } finally {
      setActingId(null);
    }
  };

  const q = search.toLowerCase();
  const filtered = rows.filter(
    (t) =>
      !q ||
      t.taskName?.toLowerCase().includes(q) ||
      employeeName(t.employeeId).toLowerCase().includes(q),
  );

  const count = (s) => rows.filter((t) => t.status === s).length;
  const overdue = rows.filter(isOverdue).length;
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
        <span className="current">Onboarding Tasks</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Onboarding Tasks</h1>
          <p>
            {staff
              ? "Your onboarding checklist."
              : "Track and assign onboarding tasks for new employees."}
          </p>
        </div>
        {canManage && (
          <button
            className="btn primary"
            onClick={() => {
              setSelected(null);
              setModalMode("create");
            }}
          >
            <Icon name="plusCircle" size={17} /> Add Task
          </button>
        )}
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="list"
          label="Pending"
          value={count("pending")}
        />
        <StatCard
          tone="purple"
          icon="clock"
          label="In progress"
          value={count("in_progress")}
        />
        <StatCard
          tone="green"
          icon="userCheck"
          label="Completed"
          value={count("completed")}
        />
        <StatCard
          tone="orange"
          icon="calendar"
          label="Overdue"
          value={overdue}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Tasks</h2>
            <p>
              {staff
                ? "Tasks assigned to you."
                : superAdmin
                  ? "Tasks across all companies."
                  : "Tasks in your company."}
            </p>
          </div>
          <div className="panel-tools">
            {!staff && (
              <div className="search-box">
                <Icon name="search" size={16} />
                <input
                  type="text"
                  placeholder="Search task or employee..."
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
              <option value="">Filter: All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading tasks...
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
                    <th>Task</th>
                    {!staff && <th>Employee</th>}
                    {superAdmin && <th>Company</th>}
                    <th>Category</th>
                    <th>Assigned To</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={7 + (staff ? 0 : 1) + (superAdmin ? 1 : 0)}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No onboarding tasks found.
                      </td>
                    </tr>
                  )}
                  {filtered.map((t) => {
                    const late = isOverdue(t);
                    const done = t.status === "completed";
                    return (
                      <tr key={t._id}>
                        <td>{t.id_int ?? "-"}</td>
                        <td
                          style={{
                            fontWeight: 500,
                            maxWidth: 260,
                            whiteSpace: "normal",
                          }}
                        >
                          {t.taskName}
                        </td>
                        {!staff && <td>{employeeName(t.employeeId)}</td>}
                        {superAdmin && <td>{companyName(t.companyId)}</td>}
                        <td>{catLabel(t.category)}</td>
                        <td>
                          {t.assignedTo ? (
                            fullName(t.assignedTo) || "-"
                          ) : (
                            <span className="muted">Unassigned</span>
                          )}
                        </td>
                        <td>
                          {fmtDate(t.dueDate)}
                          {late && (
                            <span
                              className="badge warning"
                              style={{ marginLeft: 8 }}
                            >
                              Overdue
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${STATUS_BADGE[t.status] || "plan-default"}`}
                          >
                            {STATUS_LABEL[t.status] || t.status}
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
                            {!done && (
                              <button
                                className="btn btn-sm primary"
                                disabled={actingId === t._id}
                                onClick={() => setStatus(t, "completed")}
                              >
                                <Icon name="userCheck" size={13} /> Mark done
                              </button>
                            )}
                            {canManage && (
                              <>
                                <button
                                  className="btn btn-sm"
                                  onClick={() => {
                                    setSelected(t);
                                    setModalMode("edit");
                                  }}
                                >
                                  <Icon name="edit" size={13} /> Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleDelete(t)}
                                >
                                  <Icon name="trash" size={14} /> Delete
                                </button>
                              </>
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
                Showing {from}–{to} of {pagination.total} tasks
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
        <OnboardingTaskModal
          mode={modalMode}
          task={selected}
          onClose={() => {
            setModalMode(null);
            setSelected(null);
          }}
          onSaved={() => fetchRows(pagination.page)}
        />
      )}
    </>
  );
}
