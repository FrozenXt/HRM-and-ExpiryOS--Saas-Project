import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import LeaveTypeModal from "../components/LeaveTypeModal";
import { getLeaveTypes, deleteLeaveType } from "../services/leaveTypeService";
import { listOptions } from "../services/employeeService";
import { isSuperAdmin } from "../utils/auth";

const idOf = (v) => v?._id || v || "";

export default function LeaveTypes() {
  const superAdmin = isSuperAdmin();

  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selected, setSelected] = useState(null);

  const fetchRows = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = search.trim()
        ? [{ field: "name", operator: "contains", value: search.trim() }]
        : [];
      const res = await getLeaveTypes({ page, limit: 20, fields });
      setRows(res.data.data.data);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch leave types",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1);
    if (superAdmin)
      listOptions("companies")
        .then(setCompanies)
        .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const companyName = (r) =>
    r.companyId?.legalName ||
    companies.find((c) => c._id === idOf(r.companyId))?.legalName ||
    "-";

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
    if (!window.confirm(`Delete leave type "${r.name}"?`)) return;
    try {
      await deleteLeaveType(r._id);
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
        <span className="current">Leave Types</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Leave Types</h1>
          <p>
            {superAdmin
              ? "Manage leave types across companies."
              : "Manage the leave types in your company."}
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} /> Add Leave Type
        </button>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Leave Types</h2>
            <p>Quota and carry-forward rules per leave type.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search leave types..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchRows(1)}
              />
            </div>
            <button className="btn" onClick={() => fetchRows(1)}>
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading leave types...
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
                    <th>Name</th>
                    {superAdmin && <th>Company</th>}
                    <th>Annual Quota</th>
                    <th>Carry Forward</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={superAdmin ? 6 : 5}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No leave types found. Add one to get started.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r._id}>
                        <td>{r.id_int ?? "-"}</td>
                        <td style={{ fontWeight: 500 }}>{r.name}</td>
                        {superAdmin && <td>{companyName(r)}</td>}
                        <td>{r.annualQuota} days</td>
                        <td>
                          <span
                            className={`badge ${r.carryForward ? "success" : "plan-default"}`}
                          >
                            {r.carryForward ? "Yes" : "No"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} leave types
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
        <LeaveTypeModal
          mode={modalMode}
          leaveType={selected}
          onClose={closeModal}
          onSaved={() => fetchRows(pagination.page)}
        />
      )}
    </>
  );
}
