import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { isSuperAdmin, getCurrentUser } from "../utils/auth";
import StatCard from "../components/StatCard";
import ReturnAssetModal from "../components/ReturnAssetModal";
import {
  getAssetAssignments,
  deleteAssetAssignment,
} from "../services/assetService";

const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const readableLabel = (v = "") => v[0]?.toUpperCase() + v.slice(1);

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

const conditionBadge = {
  good: "success",
  damaged: "warning",
  lost: "plan-business",
};

export default function AssetAssignments() {
  const superAdmin = isSuperAdmin();
  const role = getCurrentUser()?.role;
  const isStaff = role === "staff";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active"); // active | returned | all
  const [returningAssignment, setReturningAssignment] = useState(null);

  const fetchRows = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = [];
      if (statusFilter === "active")
        fields.push({ field: "returnedDate", operator: "eq", value: null });
      if (statusFilter === "returned")
        fields.push({ field: "returnedDate", operator: "ne", value: null });
      const result = await getAssetAssignments({
        page,
        limit: 20,
        sort: "DESC",
        sort_field: "assignedDate",
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
    return rows.filter((r) => {
      const holder = fullName(r.employeeId?.userId).toLowerCase();
      const asset =
        `${r.assetId?.assetTag || ""} ${r.assetId?.name || ""}`.toLowerCase();
      return holder.includes(q) || asset.includes(q);
    });
  }, [rows, search]);

  const activeCount = rows.filter((r) => !r.returnedDate).length;

  const handleDelete = async (r) => {
    if (!window.confirm("Delete this assignment record?")) return;
    try {
      await deleteAssetAssignment(r._id);
      fetchRows(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
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
        <span>HR Management</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Asset Assignments</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Asset Assignments</h1>
          <p>
            {isStaff
              ? "Equipment currently or previously assigned to you."
              : "Track who has which asset and when it was returned."}
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="briefcase"
          label="Total Records"
          value={pagination.total}
        />
        <StatCard
          tone="orange"
          icon="clock"
          label="Active (this page)"
          value={activeCount}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Assignment Log</h2>
            <p>A list of asset assignments visible to your role.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search by employee or asset..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="lang-btn"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by return status"
            >
              <option value="active">Active (not returned)</option>
              <option value="returned">Returned</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading assignments...
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
                    <th>Asset</th>
                    {!isStaff && <th>Employee</th>}
                    <th>Assigned Date</th>
                    <th>Returned Date</th>
                    <th>Condition</th>
                    <th>Assigned By</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={
                          isStaff ? (canManage ? 6 : 5) : canManage ? 7 : 6
                        }
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No assignment records found.
                      </td>
                    </tr>
                  )}
                  {filtered.map((r, i) => (
                    <tr key={r._id}>
                      <td>{r.id_int ?? from + i}</td>
                      <td>
                        {r.assetId?.assetTag} — {r.assetId?.name}
                      </td>
                      {!isStaff && (
                        <td>{fullName(r.employeeId?.userId) || "-"}</td>
                      )}
                      <td>{formatDate(r.assignedDate)}</td>
                      <td>{formatDate(r.returnedDate)}</td>
                      <td>
                        {r.condition ? (
                          <span
                            className={`badge ${conditionBadge[r.condition] || "warning"}`}
                          >
                            {readableLabel(r.condition)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{fullName(r.assignedBy) || "-"}</td>
                      {canManage && (
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            {!r.returnedDate && (
                              <button
                                className="btn btn-sm primary"
                                onClick={() => setReturningAssignment(r)}
                              >
                                <Icon name="chevronLeft" size={13} /> Mark
                                Returned
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(r)}
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
                Showing {from}–{to} of {pagination.total} records
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

      {returningAssignment && (
        <ReturnAssetModal
          assignment={returningAssignment}
          onClose={() => setReturningAssignment(null)}
          onSaved={() => fetchRows(pagination.page)}
        />
      )}
    </>
  );
}
