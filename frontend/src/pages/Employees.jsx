import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { isSuperAdmin } from "../utils/auth";
import StatCard from "../components/StatCard";
import EmployeeFormModal from "../components/EmployeeFormModal";
import {
  getEmployees,
  deleteEmployee,
  listOptions,
} from "../services/employeeService";

const AVATAR_COLORS = [
  "#3b82f6",
  "#10b981",
  "#0ea5e9",
  "#f97316",
  "#14b8a6",
  "#ec4899",
  "#22c55e",
  "#64748b",
  "#7c3aed",
  "#06b6d4",
];

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const nameOf = (o) => o?.name || o?.title || o?.designationName || "-";
const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";
const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

const byId = (rows) => Object.fromEntries(rows.map((r) => [r._id, r]));

export default function Employees() {
  const superAdmin = isSuperAdmin();
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [lookups, setLookups] = useState({
    users: {},
    departments: {},
    designations: {},
    companies: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalMode, setModalMode] = useState(null); // "create" | "edit" | null
  const [selected, setSelected] = useState(null);

  // Names for ids (the employee document only stores ids).
  const loadLookups = async () => {
    try {
      // allSettled: one forbidden/failed list must not blank out the others.
      const [users, departments, designations, companies] = (
        await Promise.allSettled([
          listOptions("users"),
          listOptions("departments"),
          listOptions("designations"),
          superAdmin ? listOptions("companies") : Promise.resolve([]),
        ])
      ).map((r) => (r.status === "fulfilled" ? r.value : []));
      setLookups({
        users: byId(users),
        departments: byId(departments),
        designations: byId(designations),
        companies: byId(companies),
      });
    } catch {
      /* names just fall back to "-" */
    }
  };

  const fetchEmployees = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const fields = [];
      if (statusFilter !== "all") {
        fields.push({ field: "status", operator: "eq", value: statusFilter });
      }

      const result = await getEmployees({ page, limit: 20, fields });
      setEmployees(result.data.data.data);
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
    fetchEmployees(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Works whether the API returns ids or populated objects.
  const view = (e) => {
    const user =
      typeof e.userId === "object" ? e.userId : lookups.users[e.userId];
    const dept =
      typeof e.departmentId === "object"
        ? e.departmentId
        : lookups.departments[e.departmentId];
    const desig =
      typeof e.designationId === "object"
        ? e.designationId
        : lookups.designations[e.designationId];
    const comp =
      typeof e.companyId === "object"
        ? e.companyId
        : lookups.companies[e.companyId];
    return {
      name: fullName(user) || "-",
      email: user?.email || e.personalEmail || "-",
      department: nameOf(dept),
      designation: nameOf(desig),
      company: comp?.legalName || "-",
    };
  };

  const rows = useMemo(
    () => employees.map((e) => ({ e, v: view(e) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, lookups],
  );

  const filtered = rows.filter(({ v }) => {
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      v.department.toLowerCase().includes(q)
    );
  });

  const activeCount = employees.filter((e) => e.status === "active").length;

  const handleDelete = async (emp, name) => {
    if (
      !window.confirm(
        `Delete employee profile for ${name}? This cannot be undone.`,
      )
    )
      return;
    try {
      await deleteEmployee(emp._id);
      fetchEmployees(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const openCreate = () => {
    setSelected(null);
    setModalMode("create");
  };
  const openEdit = (emp) => {
    setSelected(emp);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
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
        <span className="current">Employees</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Employees</h1>
          <p>
            Manage employee profiles across companies. Link a user to a
            department and designation.
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          Add Employee
        </button>
      </div>

      <div
        className="stat-grid"
        style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
      >
        <StatCard
          tone="blue"
          icon="users"
          label="Total Employees"
          value={pagination.total}
        />
        <StatCard
          tone="green"
          icon="users"
          label="Active (this page)"
          value={activeCount}
        />
        <StatCard
          tone="orange"
          icon="clock"
          label="Inactive (this page)"
          value={employees.length - activeCount}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Employees</h2>
            <p>A list of all employee profiles in the system.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search employees..."
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading employees...
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
                    {superAdmin && <th>Company</th>}
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={superAdmin ? 8 : 7}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No employees found. Add an employee or change the
                        filter.
                      </td>
                    </tr>
                  )}
                  {filtered.map(({ e, v }, i) => (
                    <tr key={e._id}>
                      <td>{e.id_int ?? from + i}</td>
                      <td>
                        <div className="company-cell">
                          <span
                            className="co-avatar"
                            style={{
                              background:
                                AVATAR_COLORS[i % AVATAR_COLORS.length],
                              borderRadius: "50%",
                            }}
                          >
                            {initials(v.name)}
                          </span>
                          <div>
                            <div>{v.name}</div>
                            <div
                              className="muted"
                              style={{ fontSize: 12, fontWeight: 400 }}
                            >
                              {v.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      {superAdmin && <td>{v.company}</td>}
                      <td>{v.department}</td>
                      <td>{v.designation}</td>
                      <td>{formatDate(e.joiningDate)}</td>
                      <td>
                        <span
                          className={`badge ${e.status === "active" ? "success" : "warning"}`}
                        >
                          {e.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => openEdit(e)}
                          >
                            <Icon name="edit" size={13} /> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(e, v.name)}
                          >
                            <Icon name="trash" size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} employees
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchEmployees(pagination.page - 1)}
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
                    onClick={() => fetchEmployees(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchEmployees(pagination.page + 1)}
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
        <EmployeeFormModal
          mode={modalMode}
          employee={selected}
          onClose={closeModal}
          onSaved={() => fetchEmployees(pagination.page)}
        />
      )}
    </>
  );
}
