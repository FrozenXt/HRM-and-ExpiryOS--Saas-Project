// src/pages/Resignations.jsx
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import ResignationFormModal from "../components/ResignationFormModal";
import ResignationReviewModal from "../components/ResignationReviewModal";
import { getCurrentUser } from "../utils/auth";
import {
  getResignations,
  withdrawResignation,
  deleteResignation,
} from "../services/resignationService";

const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";
const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

const STATUS_BADGE = {
  pending: "warning",
  approved: "success",
  completed: "success",
  rejected: "plan-default",
  withdrawn: "plan-default",
};

// Resignations the employee can still withdraw.
const isOpen = (r) => r.status === "pending" || r.status === "approved";

export default function Resignations() {
  const role = getCurrentUser()?.role;
  const isStaff = role === "staff";
  const isManager = ["super_admin", "admin", "hr"].includes(role);

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const fetchItems = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const fields = [];
      if (statusFilter !== "all") {
        fields.push({ field: "status", operator: "eq", value: statusFilter });
      }

      const result = await getResignations({ page, limit: 20, fields });
      const { data, total, limit } = result.data.data;
      const size = limit || 20;
      setItems(data);
      // The API returns total/page/limit only, so work out the page count.
      setPagination({
        page: result.data.data.page || page,
        limit: size,
        total: total || 0,
        total_pages: Math.max(1, Math.ceil((total || 0) / size)),
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const rows = useMemo(
    () =>
      items.map((r) => {
        const user = r.employeeId?.userId;
        return { r, name: fullName(user) || "-", email: user?.email || "-" };
      }),
    [items],
  );

  const filtered = rows.filter(({ r, name, email }) => {
    const q = search.toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      (r.reason || "").toLowerCase().includes(q)
    );
  });

  const countOf = (s) => items.filter((r) => r.status === s).length;

  const handleWithdraw = async (r) => {
    if (!window.confirm("Withdraw this resignation?")) return;
    try {
      await withdrawResignation(r._id);
      fetchItems(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (r, name) => {
    if (
      !window.confirm(
        `Delete the resignation record for ${name}? This cannot be undone.`,
      )
    )
      return;
    try {
      await deleteResignation(r._id);
      fetchItems(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const from = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);
  const colCount = isManager ? 8 : 7;

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span>HR Management</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Resignations</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Resignations</h1>
          <p>
            {isStaff
              ? "Submit your resignation and track its status."
              : "Review resignations from your company's employees."}
          </p>
        </div>
        {isStaff && (
          <button className="btn primary" onClick={() => setShowForm(true)}>
            <Icon name="plusCircle" size={17} />
            Submit Resignation
          </button>
        )}
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="users"
          label="Total Resignations"
          value={pagination.total}
        />
        <StatCard
          tone="orange"
          icon="clock"
          label="Pending (this page)"
          value={countOf("pending")}
        />
        <StatCard
          tone="green"
          icon="users"
          label="Approved (this page)"
          value={countOf("approved")}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Resignations</h2>
            <p>
              {isStaff
                ? "Your resignation requests."
                : "All resignations in your company."}
            </p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search resignations..."
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
              <option value="withdrawn">Withdrawn</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading resignations...
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
                    <th>Resigned On</th>
                    <th>Last Working Day</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Remarks</th>
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
                        No resignations found.
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
                      <td>{formatDate(r.resignationDate || r.createdAt)}</td>
                      <td>
                        {formatDate(
                          r.lastWorkingDay || r.proposedLastWorkingDay,
                        )}
                        {!r.lastWorkingDay && r.proposedLastWorkingDay && (
                          <div
                            className="muted"
                            style={{ fontSize: 12, fontWeight: 400 }}
                          >
                            proposed
                          </div>
                        )}
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
                      <td
                        style={{
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={r.remarks || ""}
                      >
                        {r.remarks || "-"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => setViewing({ r, name })}
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
                          {isStaff && isOpen(r) && (
                            <button
                              className="btn btn-sm"
                              onClick={() => handleWithdraw(r)}
                            >
                              Withdraw
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
                Showing {from}–{to} of {pagination.total} resignations
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchItems(pagination.page - 1)}
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
                    onClick={() => fetchItems(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchItems(pagination.page + 1)}
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
        <ResignationFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => fetchItems(1)}
        />
      )}

      {reviewing && (
        <ResignationReviewModal
          request={reviewing.r}
          name={reviewing.name}
          formatDate={formatDate}
          onClose={() => setReviewing(null)}
          onSaved={() => fetchItems(pagination.page)}
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
              <h2>Resignation #{viewing.r.id_int}</h2>
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
              ["Employee", viewing.name],
              ["Status", cap(viewing.r.status)],
              ["Resigned on", formatDate(viewing.r.resignationDate)],
              [
                "Proposed last working day",
                formatDate(viewing.r.proposedLastWorkingDay),
              ],
              [
                "Confirmed last working day",
                formatDate(viewing.r.lastWorkingDay),
              ],
              ["Reason", viewing.r.reason || "-"],
              ["Remarks", viewing.r.remarks || "-"],
              ["Reviewed at", formatDate(viewing.r.reviewedAt)],
              ["Completed at", formatDate(viewing.r.completedAt)],
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
          </div>
        </div>
      )}
    </>
  );
}
