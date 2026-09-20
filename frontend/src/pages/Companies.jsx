import { useEffect, useState } from "react";
import { getCompanies } from "../services/companyService";
import { Icon } from "../components/Icon";
import CompanyFormModal from "../components/CompanyFormModal";
import { assetUrl } from "../services/uploadService";

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

// Adjust these getters if your API uses different field names.
const planName = (c) => c.plan?.name || c.planName || "-";
const userCount = (c) => c.userCount ?? c.usersCount ?? c.employeeCount ?? "-";

function planClass(name) {
  const n = String(name).toLowerCase();
  if (n.includes("enterprise")) return "plan-enterprise";
  if (n.includes("business")) return "plan-business";
  if (n.includes("pro")) return "plan-pro";
  return "plan-default";
}

function CompanyLogo({ company, color }) {
  const [failed, setFailed] = useState(false);

  if (company.logoUrl && !failed) {
    return (
      <img
        className="co-logo"
        src={assetUrl(company.logoUrl)}
        alt={`${company.legalName} logo`}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="co-avatar" style={{ background: color }}>
      {initials(company.legalName)}
    </span>
  );
}

function StatCard({ tone, icon, label, value, trend }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon name={icon} size={24} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {trend && <div className="stat-trend">{trend}</div>}
      </div>
    </div>
  );
}

export default function Companies() {
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalMode, setModalMode] = useState(null); // "create" | "edit" | null
  const [selectedCompany, setSelectedCompany] = useState(null);

  const fetchCompanies = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const fields = [];
      if (statusFilter === "active") {
        fields.push({ field: "isActive", operator: "eq", value: true });
      } else if (statusFilter === "inactive") {
        fields.push({ field: "isActive", operator: "eq", value: false });
      }

      const result = await getCompanies({
        page,
        limit: 20,
        sort: "DESC",
        sort_field: "createdAt",
        fields,
      });

      setCompanies(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.legalName?.toLowerCase().includes(q) ||
      c.tradeName?.toLowerCase().includes(q) ||
      c.contactPerson?.email?.toLowerCase().includes(q)
    );
  });

  const activeCount = companies.filter((c) => c.isActive).length;
  const totalUsers = companies.reduce(
    (sum, c) => sum + (Number(userCount(c)) || 0),
    0,
  );
  const activeRate = companies.length
    ? Math.round((activeCount / companies.length) * 100)
    : 0;

  const openCreate = () => {
    setSelectedCompany(null);
    setModalMode("create");
  };
  const openEdit = (company) => {
    setSelectedCompany(company);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelectedCompany(null);
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
        <span className="current">Companies</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Companies</h1>
          <p>
            Manage all companies in your system. You can view, edit, delete or
            manage company details.
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          New Company
        </button>
      </div>

      {/* Stat cards — Revenue is a placeholder until you have a billing API */}
      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="building"
          label="Total Companies"
          value={pagination.total}
        />
        <StatCard
          tone="green"
          icon="users"
          label="Total Users"
          value={totalUsers}
        />
        <StatCard
          tone="purple"
          icon="clock"
          label="Active Companies"
          value={activeCount}
          trend={`${activeRate}% active rate`}
        />
        <StatCard tone="orange" icon="dollar" label="Total Revenue" value="—" />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Companies</h2>
            <p>A list of all companies registered in the system.</p>
          </div>

          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search companies..."
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
            Loading companies...
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
                    <th>Company Name</th>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Users</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No companies found. Try a different search or filter.
                      </td>
                    </tr>
                  )}
                  {filtered.map((c, i) => (
                    <tr key={c._id}>
                      <td>{from + i}</td>
                      <td>
                        <div className="company-cell">
                          <CompanyLogo
                            company={c}
                            color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                          />
                          {c.legalName}
                        </div>
                      </td>
                      <td>{c.contactPerson?.email || c.billingEmail || "-"}</td>
                      <td>
                        <span className={`badge ${planClass(planName(c))}`}>
                          {planName(c)}
                        </span>
                      </td>
                      <td>{userCount(c)}</td>
                      <td>
                        <span
                          className={`badge ${c.isActive ? "success" : "warning"}`}
                        >
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{formatDate(c.createdAt)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn btn-sm">
                            <Icon name="eye" size={14} /> View
                          </button>
                          <button
                            className="btn btn-sm"
                            onClick={() => openEdit(c)}
                          >
                            <Icon name="edit" size={13} /> Edit
                          </button>
                          <button className="btn btn-sm btn-danger">
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
                Showing {from}–{to} of {pagination.total} companies
              </span>

              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchCompanies(pagination.page - 1)}
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
                    onClick={() => fetchCompanies(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchCompanies(pagination.page + 1)}
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
        <CompanyFormModal
          mode={modalMode}
          company={selectedCompany}
          onClose={closeModal}
          onSaved={() => fetchCompanies(pagination.page)}
        />
      )}
    </>
  );
}
