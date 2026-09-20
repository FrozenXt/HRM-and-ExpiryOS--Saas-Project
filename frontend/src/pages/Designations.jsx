import { useEffect, useState } from "react";
import {
  getDesignations,
  deleteDesignation,
} from "../services/designationService";
import { listOptions } from "../services/employeeService";
import { Icon } from "../components/Icon";
import DesignationModal from "../components/DesignationModal";
import { isSuperAdmin } from "../utils/auth";

const idOf = (v) => v?._id || v || "";

export default function Designations() {
  const superAdmin = isSuperAdmin();

  const [designations, setDesignations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
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
  const [selectedDesignation, setSelectedDesignation] = useState(null);

  const fetchDesignations = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const fields = [];
      if (search.trim()) {
        fields.push({
          field: "name",
          operator: "contains",
          value: search.trim(),
        });
      }

      const result = await getDesignations({
        page,
        limit: 20,
        sort: "ASC",
        sort_field: "name",
        fields,
      });
      setDesignations(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch designations",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesignations(1);
    listOptions("departments")
      .then(setDepartments)
      .catch(() => {});
    if (superAdmin)
      listOptions("companies")
        .then(setCompanies)
        .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const companyName = (d) =>
    d.companyId?.legalName ||
    companies.find((c) => c._id === idOf(d.companyId))?.legalName ||
    "-";
  const departmentName = (d) =>
    d.departmentId?.name ||
    departments.find((x) => x._id === idOf(d.departmentId))?.name ||
    "-";

  const openCreate = () => {
    setSelectedDesignation(null);
    setModalMode("create");
  };
  const openEdit = (designation) => {
    setSelectedDesignation(designation);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelectedDesignation(null);
  };

  const handleDelete = async (designation) => {
    if (!window.confirm(`Delete designation "${designation.name}"?`)) return;
    try {
      await deleteDesignation(designation._id);
      fetchDesignations(pagination.page);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete designation",
      );
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
        <span className="current">Designations</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Designations</h1>
          <p>
            {superAdmin
              ? "Manage job designations across companies and departments."
              : "Manage the job designations in your company."}
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          Add Designation
        </button>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Designations</h2>
            <p>
              A list of all designations{superAdmin ? " in the system" : ""}.
            </p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search designations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchDesignations(1)}
              />
            </div>
            <button className="btn" onClick={() => fetchDesignations(1)}>
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading designations...
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
                    <th>Department</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {designations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={superAdmin ? 6 : 5}
                        style={{ textAlign: "center", padding: 28 }}
                        className="muted"
                      >
                        No designations found. Add one to get started.
                      </td>
                    </tr>
                  ) : (
                    designations.map((d) => (
                      <tr key={d._id}>
                        <td>{d.id_int ?? "-"}</td>
                        <td style={{ fontWeight: 500 }}>{d.name}</td>
                        {superAdmin && <td>{companyName(d)}</td>}
                        <td>{departmentName(d)}</td>
                        <td className="muted">
                          {d.createdAt
                            ? new Date(d.createdAt).toLocaleDateString()
                            : "-"}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="btn btn-sm"
                              onClick={() => openEdit(d)}
                            >
                              <Icon name="edit" size={13} /> Edit
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(d)}
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
                Showing {from}–{to} of {pagination.total} designations
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchDesignations(pagination.page - 1)}
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
                    onClick={() => fetchDesignations(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchDesignations(pagination.page + 1)}
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
        <DesignationModal
          mode={modalMode}
          designation={selectedDesignation}
          onClose={closeModal}
          onSaved={() => fetchDesignations(pagination.page)}
        />
      )}
    </>
  );
}
