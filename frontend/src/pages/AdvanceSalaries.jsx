// src/pages/AdvanceSalaries.jsx
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import AdvanceSalaryFormModal from "../components/AdvanceSalaryFormModal";
import AdvanceSalaryReviewModal from "../components/AdvanceSalaryReviewModal";
import { getCurrentUser } from "../utils/auth";
import {
  getAdvanceSalaries,
  cancelAdvanceSalary,
  deleteAdvanceSalary,
} from "../services/advanceSalaryService";
import { listOptions } from "../services/employeeService";

const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";
const byId = (rows) => Object.fromEntries(rows.map((r) => [r._id, r]));

const STATUS_BADGE = {
  pending: "warning",
  approved: "success",
  rejected: "plan-default",
  cancelled: "plan-default",
  recovered: "success",
  closed: "plan-default",
};
const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

export default function AdvanceSalaries() {
  const role = getCurrentUser()?.role;
  const isStaff = role === "staff";
  const isManager = ["super_admin", "admin", "hr"].includes(role);

  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [currencies, setCurrencies] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    listOptions("currencies")
      .then((rows) => setCurrencies(byId(rows)))
      .catch(() => {
        /* amounts just show without a currency code */
      });
  }, []);

  const fetchRequests = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const fields = [];
      if (statusFilter !== "all") {
        fields.push({ field: "status", operator: "eq", value: statusFilter });
      }

      const result = await getAdvanceSalaries({ page, limit: 20, fields });
      const { data, total, limit } = result.data.data;
      setRequests(data);
      // The API returns total/page/limit only, so work out the page count.
      setPagination({
        page: result.data.data.page || page,
        limit: limit || 20,
        total: total || 0,
        total_pages: Math.max(1, Math.ceil((total || 0) / (limit || 20))),
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const money = (r, value = r.amount) => {
    const code = currencies[r.currencyId]?.code || "";
    return `${code ? code + " " : ""}${Number(value || 0).toLocaleString()}`;
  };

  const rows = useMemo(
    () =>
      requests.map((r) => {
        const user = r.employeeId?.userId;
        return { r, name: fullName(user) || "-", email: user?.email || "-" };
      }),
    [requests],
  );

  const filtered = rows.filter(({ r, name, email }) => {
    const q = search.toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      (r.reason || "").toLowerCase().includes(q)
    );
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const outstanding = requests
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + (r.amount - (r.recoveredAmount || 0)), 0);

  const handleCancel = async (r) => {
    if (!window.confirm("Cancel this advance salary request?")) return;
    try {
      await cancelAdvanceSalary(r._id);
      fetchRequests(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (r, name) => {
    if (
      !window.confirm(
        `Delete the advance salary request for ${name}? This cannot be undone.`,
      )
    )
      return;
    try {
      await deleteAdvanceSalary(r._id);
      fetchRequests(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const from = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);
  const colCount = isManager ? 9 : 8;

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span>Payroll</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Advance Salary</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Advance Salary</h1>
          <p>
            {isStaff
              ? "Request an advance on your salary and track its recovery."
              : "Review advance salary requests from your company's employees."}
          </p>
        </div>
        {isStaff && (
          <button className="btn primary" onClick={() => setShowForm(true)}>
            <Icon name="plusCircle" size={17} />
            Request Advance
          </button>
        )}
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="users"
          label="Total Requests"
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
          icon="users"
          label="Approved (this page)"
          value={approvedCount}
        />
        <StatCard
          tone="blue"
          icon="clock"
          label="Outstanding (this page)"
          value={Number(outstanding).toLocaleString()}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Requests</h2>
            <p>
              {isStaff
                ? "Your advance salary requests."
                : "All advance salary requests in your company."}
            </p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search requests..."
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
              <option value="all">Filter: All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
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
                    {isManager && <th>Employee</th>}
                    <th>Amount</th>
                    <th>Installments</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Recovered</th>
                    <th>Requested</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={colCount}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No advance salary requests found.
                      </td>
                    </tr>
                  )}
                  {filtered.map(({ r, name, email }, i) => (
                    <tr key={r._id}>
                      <td>{r.id_int ?? from + i}</td>
                      {isManager && (
                        <td>
                          <div>{name}</div>
                          <div
                            className="muted"
                            style={{ fontSize: 12, fontWeight: 400 }}
                          >
                            {email}
                          </div>
                        </td>
                      )}
                      <td>{money(r)}</td>
                      <td>
                        {r.installments} ×{" "}
                        {Number(r.installmentAmount || 0).toLocaleString()}
                      </td>
                      <td
                        style={{
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={r.reason}
                      >
                        {r.reason || "-"}
                      </td>
                      <td>
                        <span
                          className={`badge ${STATUS_BADGE[r.status] || "plan-default"}`}
                          style={
                            r.status === "rejected"
                              ? { color: "var(--red)" }
                              : undefined
                          }
                        >
                          {cap(r.status)}
                        </span>
                      </td>
                      <td>
                        {money(r, r.recoveredAmount)} /{" "}
                        {Number(r.amount).toLocaleString()}
                      </td>
                      <td>{formatDate(r.createdAt)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => setViewing(r)}
                          >
                            <Icon name="eye" size={13} /> View
                          </button>
                          {isManager && r.status === "pending" && (
                            <button
                              className="btn btn-sm"
                              onClick={() => setReviewing({ r, name })}
                            >
                              <Icon name="edit" size={13} /> Review
                            </button>
                          )}
                          {isStaff && r.status === "pending" && (
                            <button
                              className="btn btn-sm"
                              onClick={() => handleCancel(r)}
                            >
                              Cancel
                            </button>
                          )}
                          {isManager && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(r, name)}
                            >
                              <Icon name="trash" size={14} /> Delete
                            </button>
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
                Showing {from}–{to} of {pagination.total} requests
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchRequests(pagination.page - 1)}
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
                    onClick={() => fetchRequests(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchRequests(pagination.page + 1)}
                  aria-label="Next page"
                >
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {showForm && (
        <AdvanceSalaryFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => fetchRequests(1)}
        />
      )}

      {reviewing && (
        <AdvanceSalaryReviewModal
          request={reviewing.r}
          name={reviewing.name}
          money={(v) => money(reviewing.r, v)}
          onClose={() => setReviewing(null)}
          onSaved={() => fetchRequests(pagination.page)}
        />
      )}

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
              <h2>Advance Salary #{viewing.id_int}</h2>
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
            {[
              ["Employee", fullName(viewing.employeeId?.userId) || "-"],
              ["Amount", money(viewing)],
              [
                "Installments",
                `${viewing.installments} × ${Number(viewing.installmentAmount || 0).toLocaleString()}`,
              ],
              ["Status", cap(viewing.status)],
              ["Reason", viewing.reason || "-"],
              ["Start period", viewing.startPeriod || "-"],
              ["Recovered", money(viewing, viewing.recoveredAmount)],
              ["Approved at", formatDate(viewing.approvedAt)],
              ["Remarks", viewing.remarks || "-"],
              ["Requested", formatDate(viewing.createdAt)],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border, rgba(128,128,128,.2))",
                }}
              >
                <span className="muted">{k}</span>
                <span style={{ textAlign: "right" }}>{v}</span>
              </div>
            ))}
            <h3 style={{ margin: "16px 0 8px", fontSize: 14 }}>Repayments</h3>
            {(viewing.repayments || []).length === 0 ? (
              <div className="muted">No repayments yet.</div>
            ) : (
              (viewing.repayments || []).map((p, i) => (
                <div
                  key={p._id || i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                  }}
                >
                  <span>{p.period || formatDate(p.date || p.createdAt)}</span>
                  <span>{money(viewing, p.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
