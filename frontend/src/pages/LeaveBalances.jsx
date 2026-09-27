import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import LeaveBalanceModal from "../components/LeaveBalanceModal";
import {
  getLeaveBalances,
  deleteLeaveBalance,
} from "../services/leaveBalanceService";
import { listOptions } from "../services/employeeService";
import { getCurrentUser } from "../utils/auth";

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const byId = (rows) => Object.fromEntries(rows.map((r) => [r._id, r]));

export default function LeaveBalances() {
  const role = getCurrentUser()?.role || "";
  const staff = role === "staff";
  const canManage = role === "admin" || role === "hr" || role === "super_admin";

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
  const [yearFilter, setYearFilter] = useState("");
  const [modalMode, setModalMode] = useState(null);
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

  // Names for ids (records only store ids).
  useEffect(() => {
    if (staff) return;
    Promise.allSettled([
      listOptions("employees"),
      listOptions("users"),
      listOptions("leave-types"),
    ]).then(([e, u, l]) => {
      setNames({
        employees: byId(e.status === "fulfilled" ? e.value : []),
        users: byId(u.status === "fulfilled" ? u.value : []),
        leaveTypes: byId(l.status === "fulfilled" ? l.value : []),
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
      .filter(({ v }) => {
        if (!q) return true;
        return (
          v.employee.toLowerCase().includes(q) ||
          v.leaveType.toLowerCase().includes(q)
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, names, search]);

  const totalUsed = rows.reduce((n, r) => n + (r.used || 0), 0);
  const totalRemaining = rows.reduce((n, r) => n + (r.remaining || 0), 0);

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

  const handleDelete = async (r, v) => {
    if (
      !window.confirm(
        `Delete the ${v.leaveType} balance for ${v.employee} (${r.year})?`,
      )
    )
      return;
    try {
      await deleteLeaveBalance(r._id);
      fetchRows(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to delete");
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
        <span>Leave Management</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Leave Balances</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Leave Balances</h1>
          <p>
            {staff
              ? "Your leave balances by type and year."
              : "Leave balances for every employee, by type and year."}
          </p>
        </div>
        {canManage && (
          <button className="btn primary" onClick={openCreate}>
            <Icon name="plusCircle" size={17} /> Add Balance
          </button>
        )}
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
                    <th>Used</th>
                    <th>Remaining</th>
                    <th>Total</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={staff ? 6 : canManage ? 8 : 7}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No leave balances found.
                      </td>
                    </tr>
                  )}
                  {filtered.map(({ r, v }, i) => (
                    <tr key={r._id}>
                      <td>{from + i}</td>
                      {!staff && (
                        <td style={{ fontWeight: 500 }}>{v.employee}</td>
                      )}
                      <td>{v.leaveType}</td>
                      <td>{r.year}</td>
                      <td>{r.used}</td>
                      <td>
                        <span
                          className={`badge ${r.remaining > 0 ? "success" : "warning"}`}
                        >
                          {r.remaining}
                        </span>
                      </td>
                      <td>{(r.used || 0) + (r.remaining || 0)}</td>
                      {canManage && (
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="btn btn-sm"
                              onClick={() => openEdit(r)}
                            >
                              <Icon name="edit" size={13} /> Adjust
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(r, v)}
                            >
                              <Icon name="trash" size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
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

      {modalMode && (
        <LeaveBalanceModal
          mode={modalMode}
          balance={selected}
          employeeName={selected ? view(selected).employee : ""}
          leaveTypeName={selected ? view(selected).leaveType : ""}
          onClose={closeModal}
          onSaved={() => fetchRows(pagination.page)}
        />
      )}
    </>
  );
}
