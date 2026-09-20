import { useEffect, useState } from "react";
import { listOptions } from "../services/employeeService";
import { Icon } from "../components/Icon";
import UserFormModal from "../components/UserFormModal";
import { getUsers, deleteUser } from "../services/userService";
import { isSuperAdmin } from "../utils/auth";

const idOf = (v) => v?._id || v || "";

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

const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  hr: "HR",
  staff: "Staff",
};
const ROLE_BADGE = {
  super_admin: "plan-enterprise",
  admin: "plan-business",
  hr: "plan-pro",
  staff: "plan-default",
};

export default function Users() {
  const superAdmin = isSuperAdmin();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companies, setCompanies] = useState([]);
  const [modalMode, setModalMode] = useState(null); // "create" | "edit" | null
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const fields = [];
      if (statusFilter !== "all") {
        fields.push({ field: "status", operator: "eq", value: statusFilter });
      }

      const result = await getUsers({
        page,
        limit: 20,
        sort: "DESC",
        sort_field: "createdAt",
        fields,
      });

      setUsers(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Only a super admin needs company names.
  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then(setCompanies)
      .catch(() => {});
  }, [superAdmin]);

  const companyName = (u) => {
    if (!u.companyId) return "—";
    const c =
      typeof u.companyId === "object"
        ? u.companyId
        : companies.find((x) => x._id === idOf(u.companyId));
    return c ? c.tradeName || c.legalName : "-";
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const initials = (user) =>
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
    "?";

  const openCreate = () => {
    setSelectedUser(null);
    setModalMode("create");
  };
  const openEdit = (user) => {
    setSelectedUser(user);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete ${user.firstName} ${user.lastName}?`)) return;
    try {
      await deleteUser(user._id);
      fetchUsers(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete user");
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
        <span className="current">Users</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>{superAdmin ? "All Users" : "Users"}</h1>
          <p>
            {superAdmin
              ? "Manage every user across all companies."
              : "Manage the users in your company."}
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          Add User
        </button>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Users</h2>
            <p>
              A list of all users
              {superAdmin ? " in the system" : " in your company"}.
            </p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search users..."
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
            Loading users...
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
                    <th>Email</th>
                    <th>Role</th>
                    {superAdmin && <th>Company</th>}
                    <th>Status</th>
                    <th>Last Login</th>
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
                        No users found. Try a different search or filter.
                      </td>
                    </tr>
                  )}
                  {filtered.map((u, i) => (
                    <tr key={u._id}>
                      <td>{u.id_int ?? from + i}</td>
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
                            {initials(u)}
                          </span>
                          {u.firstName} {u.lastName}
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span
                          className={`badge ${ROLE_BADGE[u.role] || "plan-default"}`}
                        >
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      {superAdmin && <td>{companyName(u)}</td>}
                      <td>
                        <span
                          className={`badge ${u.status === "active" ? "success" : "warning"}`}
                        >
                          {u.status[0].toUpperCase() + u.status.slice(1)}
                        </span>
                      </td>
                      <td className="muted">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleString()
                          : "Never"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => openEdit(u)}
                          >
                            <Icon name="edit" size={13} /> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(u)}
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
                Showing {from}–{to} of {pagination.total} users
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchUsers(pagination.page - 1)}
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
                    onClick={() => fetchUsers(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchUsers(pagination.page + 1)}
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
        <UserFormModal
          mode={modalMode}
          user={selectedUser}
          companies={companies}
          onClose={closeModal}
          onSaved={() => fetchUsers(pagination.page)}
        />
      )}
    </>
  );
}
