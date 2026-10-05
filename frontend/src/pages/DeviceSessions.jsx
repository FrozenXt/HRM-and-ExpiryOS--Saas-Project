// src/pages/DeviceSessions.jsx
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { getCurrentUser } from "../utils/auth";
import StatCard from "../components/StatCard";
import {
  getDeviceSessions,
  endDeviceSession,
  deleteDeviceSession,
} from "../services/deviceSessionService";

const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const readableLabel = (v = "") => (v ? v[0].toUpperCase() + v.slice(1) : "-");

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

const formatDuration = (start, end) => {
  if (!start) return "-";
  const ms = (end ? new Date(end) : new Date()) - new Date(start);
  if (ms < 0) return "-";
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
};

export default function DeviceSessions() {
  const me = getCurrentUser();
  const role = me?.role;
  const myUserId = me?.id || me?._id;
  const isStaff = role === "staff";
  const superAdmin = role === "super_admin";
  const canManage = ["super_admin", "admin", "hr"].includes(role);

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | ended
  const [typeFilter, setTypeFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  const fetchRows = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = [];
      if (statusFilter === "active")
        fields.push({ field: "sessionEnd", operator: "eq", value: null });
      if (statusFilter === "ended")
        fields.push({ field: "sessionEnd", operator: "ne", value: null });
      if (typeFilter !== "all")
        fields.push({ field: "deviceType", operator: "eq", value: typeFilter });
      const result = await getDeviceSessions({ page, limit: 20, fields });
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
  }, [statusFilter, typeFilter]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((s) => {
      const name = fullName(s.employeeId?.userId).toLowerCase();
      return (
        name.includes(q) ||
        s.employeeId?.userId?.email?.toLowerCase().includes(q) ||
        s.deviceId?.toLowerCase().includes(q) ||
        s.os?.toLowerCase().includes(q) ||
        s.ipAddress?.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const activeCount = rows.filter((s) => !s.sessionEnd).length;
  const deviceCount = new Set(rows.map((s) => s.deviceId)).size;

  const handleEnd = async (s) => {
    if (!window.confirm("End this session now?")) return;
    try {
      setBusyId(s._id);
      setActionError("");
      await endDeviceSession(s._id);
      fetchRows(pagination.page);
    } catch (err) {
      setActionError(err.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm("Delete this session record?")) return;
    try {
      setActionError("");
      await deleteDeviceSession(s._id);
      fetchRows(pagination.page);
    } catch (err) {
      setActionError(err.response?.data?.message || err.message);
    }
  };

  const from = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);
  const showActions = true; // "End Session" (own) and/or Delete (managers) can apply to any row

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span>Attendance</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Device Sessions</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>{isStaff ? "My Device Sessions" : "Device Sessions"}</h1>
          <p>
            {isStaff
              ? "Devices and apps you've signed in from."
              : "Monitor which devices employees are using and when."}
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="activity"
          label="Total Sessions"
          value={pagination.total}
        />
        <StatCard
          tone="green"
          icon="clock"
          label="Active (this page)"
          value={activeCount}
        />
        <StatCard
          tone="purple"
          icon="shield"
          label="Unique Devices (this page)"
          value={deviceCount}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Session Log</h2>
            <p>Most recent sessions first.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search employee, device, OS or IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="lang-btn"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by device type"
            >
              <option value="all">All devices</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
              <option value="web">Web</option>
            </select>
            <select
              className="lang-btn"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All sessions</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </div>

        {actionError && (
          <div
            style={{ color: "var(--red)", fontSize: 13, padding: "10px 20px" }}
          >
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading sessions...
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
                    {superAdmin && <th>Company</th>}
                    <th>Device</th>
                    <th>OS / App</th>
                    <th>IP Address</th>
                    <th>Started</th>
                    <th>Duration</th>
                    <th>Status</th>
                    {showActions && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={
                          7 +
                          (isStaff ? 0 : 1) +
                          (superAdmin ? 1 : 0) +
                          (showActions ? 1 : 0)
                        }
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No device sessions found.
                      </td>
                    </tr>
                  )}
                  {filtered.map((s, i) => {
                    const active = !s.sessionEnd;
                    const isMine =
                      !!myUserId && s.employeeId?.userId?._id === myUserId;
                    const user = s.employeeId?.userId;
                    return (
                      <tr key={s._id}>
                        <td>{s.id_int ?? from + i}</td>
                        {!isStaff && (
                          <td>
                            <div style={{ fontWeight: 500 }}>
                              {fullName(user) || "-"}
                            </div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {[
                                s.employeeId?.departmentId?.name,
                                s.employeeId?.designationId?.name,
                              ]
                                .filter(Boolean)
                                .join(" · ") || user?.email}
                            </div>
                          </td>
                        )}
                        {superAdmin && <td>{s.companyId?.legalName || "-"}</td>}
                        <td>
                          <span className="badge plan-default">
                            {readableLabel(s.deviceType)}
                          </span>
                          <div
                            className="muted"
                            style={{ fontSize: 12, marginTop: 4 }}
                          >
                            {s.deviceId}
                          </div>
                        </td>
                        <td>
                          <div>{s.os || "-"}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {s.appVersion ? `v${s.appVersion}` : "-"}
                          </div>
                        </td>
                        <td>{s.ipAddress || "-"}</td>
                        <td>{formatDateTime(s.sessionStart)}</td>
                        <td>{formatDuration(s.sessionStart, s.sessionEnd)}</td>
                        <td>
                          <span
                            className={`badge ${active ? "success" : "plan-business"}`}
                          >
                            {active ? "Active" : "Ended"}
                          </span>
                        </td>
                        {showActions && (
                          <td>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              {active && isMine && (
                                <button
                                  className="btn btn-sm primary"
                                  disabled={busyId === s._id}
                                  onClick={() => handleEnd(s)}
                                >
                                  End Session
                                </button>
                              )}
                              {canManage && (
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleDelete(s)}
                                >
                                  <Icon name="trash" size={14} /> Delete
                                </button>
                              )}
                            </div>
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
                Showing {from}–{to} of {pagination.total} sessions
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
    </>
  );
}
