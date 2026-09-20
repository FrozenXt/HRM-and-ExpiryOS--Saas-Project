import { useEffect, useState } from "react";
import {
  getDepartments,
  deleteDepartment,
} from "../services/departmentService";
import { listOptions } from "../services/employeeService";
import { Icon } from "../components/Icon";
import DepartmentModal from "../components/DepartmentModal";
import { isSuperAdmin } from "../utils/auth";

const idOf = (v) => v?._id || v || "";

export default function Departments() {
  const superAdmin = isSuperAdmin();

  const [departments, setDepartments] = useState([]);
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
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const fetchDepartments = async (page = 1) => {
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

      const result = await getDepartments({
        page,
        limit: 20,
        sort: "ASC",
        sort_field: "name",
        fields,
      });
      setDepartments(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch departments",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments(1);
    if (superAdmin) {
      listOptions("companies")
        .then(setCompanies)
        .catch((err) => console.error("Failed to load companies:", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const companyName = (dept) =>
    dept.companyId?.legalName ||
    companies.find((c) => c._id === idOf(dept.companyId))?.legalName ||
    "-";

  const openCreate = () => {
    setSelectedDepartment(null);
    setModalMode("create");
  };
  const openEdit = (department) => {
    setSelectedDepartment(department);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelectedDepartment(null);
  };

  const handleDelete = async (department) => {
    if (!window.confirm(`Delete department "${department.name}"?`)) return;
    try {
      await deleteDepartment(department._id);
      fetchDepartments(pagination.page);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete department",
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
        <span className="current">Departments</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Departments</h1>
          <p>
            {superAdmin
              ? "Manage departments across all companies."
              : "Manage the departments in your company."}
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          Add Department
        </button>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Departments</h2>
            <p>
              A list of all departments{superAdmin ? " in the system" : ""}.
            </p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search departments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchDepartments(1)}
              />
            </div>
            <button className="btn" onClick={() => fetchDepartments(1)}>
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading departments...
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
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={superAdmin ? 5 : 4}
                        style={{ textAlign: "center", padding: 28 }}
                        className="muted"
                      >
                        No departments found. Add one to get started.
                      </td>
                    </tr>
                  ) : (
                    departments.map((d) => (
                      <tr key={d._id}>
                        <td>{d.id_int ?? "-"}</td>
                        <td style={{ fontWeight: 500 }}>{d.name}</td>
                        {superAdmin && <td>{companyName(d)}</td>}
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
                Showing {from}–{to} of {pagination.total} departments
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchDepartments(pagination.page - 1)}
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
                    onClick={() => fetchDepartments(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchDepartments(pagination.page + 1)}
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
        <DepartmentModal
          mode={modalMode}
          department={selectedDepartment}
          onClose={closeModal}
          onSaved={() => fetchDepartments(pagination.page)}
        />
      )}
    </>
  );
}
