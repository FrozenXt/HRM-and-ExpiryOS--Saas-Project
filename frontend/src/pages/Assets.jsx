import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { isSuperAdmin } from "../utils/auth";
import StatCard from "../components/StatCard";
import AssetFormModal from "../components/AssetFormModal";
import AssignAssetModal from "../components/AssignAssetModal";
import { FILE_BASE } from "../config";
import { listOptions } from "../services/employeeService";
import { getAssets, deleteAsset } from "../services/assetService";

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

const byId = (rows) => Object.fromEntries(rows.map((r) => [r._id, r]));

const nameFrom = (u) =>
  u && typeof u === "object" ? `${u.firstName} ${u.lastName || ""}`.trim() : "";

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const readableLabel = (v = "") =>
  v
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");

const statusBadge = {
  available: "success",
  assigned: "plan-default",
  under_repair: "warning",
  retired: "plan-business",
};

// Photo if there is one, otherwise coloured initials. Falls back to the
// initials if the image fails to load.
function PersonAvatar({ name, profileImage, color, size = 34 }) {
  const [failed, setFailed] = useState(false);

  if (profileImage && !failed) {
    return (
      <img
        src={`${FILE_BASE}${profileImage}`}
        alt={name}
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <span
      className="co-avatar"
      style={{ background: color, borderRadius: "50%" }}
    >
      {initials(name)}
    </span>
  );
}

export default function Assets() {
  const superAdmin = isSuperAdmin();
  const [assets, setAssets] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [companies, setCompanies] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modalMode, setModalMode] = useState(null);
  const [selected, setSelected] = useState(null);
  const [assigningAsset, setAssigningAsset] = useState(null);

  // Only a super admin sees the Company column, so only they need this.
  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then((rows) => setCompanies(byId(rows)))
      .catch(() => {});
  }, [superAdmin]);

  const fetchAssets = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = [];
      if (statusFilter !== "all")
        fields.push({ field: "status", operator: "eq", value: statusFilter });
      if (categoryFilter !== "all")
        fields.push({
          field: "category",
          operator: "eq",
          value: categoryFilter,
        });
      const result = await getAssets({ page, limit: 20, fields });
      setAssets(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter]);

  // Everything comes from the list response; the nested currentAssignment
  // is kept as a fallback. Only the company name needs the lookup.
  const view = (a) => {
    const company =
      typeof a.companyId === "object" ? a.companyId : companies[a.companyId];
    const ca = a.currentAssignment || null;
    const emp = ca && typeof ca.employeeId === "object" ? ca.employeeId : null;
    const user = emp && typeof emp.userId === "object" ? emp.userId : null;
    return {
      company: company?.legalName || "-",
      assigned: a.isAssigned ?? !!ca,
      holderName: a.holderName || nameFrom(user) || "",
      holderImage: a.holderImage || user?.profileImage || null,
      holderEmail: a.holderEmail || user?.email || "",
      holderDepartment: a.holderDepartment || emp?.departmentId?.name || "",
      holderDesignation: a.holderDesignation || emp?.designationId?.name || "",
      assignedBy: a.assignedByName || nameFrom(ca?.assignedBy) || "",
      daysHeld: a.daysHeld,
    };
  };

  const rows = useMemo(
    () => assets.map((a) => ({ a, v: view(a) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assets, companies],
  );

  const filtered = rows.filter(({ a, v }) => {
    const q = search.toLowerCase();
    return (
      a.assetTag?.toLowerCase().includes(q) ||
      a.name?.toLowerCase().includes(q) ||
      a.serialNumber?.toLowerCase().includes(q) ||
      v.company.toLowerCase().includes(q) ||
      v.holderName.toLowerCase().includes(q) ||
      v.holderDepartment.toLowerCase().includes(q)
    );
  });

  const availableCount = assets.filter((a) => a.status === "available").length;
  const assignedCount = assets.filter((a) => a.status === "assigned").length;

  const openCreate = () => {
    setSelected(null);
    setModalMode("create");
  };
  const openEdit = (a) => {
    setSelected(a);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete asset "${a.name}" (${a.assetTag})?`)) return;
    try {
      await deleteAsset(a._id);
      fetchAssets(pagination.page);
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
        <span className="current">Assets</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Assets</h1>
          <p>Manage company equipment and who currently holds it.</p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          Add Asset
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="briefcase"
          label="Total Assets"
          value={pagination.total}
        />
        <StatCard
          tone="green"
          icon="check"
          label="Available (this page)"
          value={availableCount}
        />
        <StatCard
          tone="orange"
          icon="users"
          label="Assigned (this page)"
          value={assignedCount}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Asset Inventory</h2>
            <p>A list of all assets visible to your role.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search by tag, name, holder or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="lang-btn"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              <option value="laptop">Laptop</option>
              <option value="mobile">Mobile</option>
              <option value="accessory">Accessory</option>
              <option value="furniture">Furniture</option>
              <option value="other">Other</option>
            </select>
            <select
              className="lang-btn"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="under_repair">Under Repair</option>
              <option value="retired">Retired</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading assets...
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
                    <th>Asset Tag</th>
                    <th>Name</th>
                    <th>Category</th>
                    {superAdmin && <th>Company</th>}
                    <th>Currently With</th>
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
                        No assets found. Add one or change the filter.
                      </td>
                    </tr>
                  )}
                  {filtered.map(({ a, v }, i) => {
                    const sub = [v.holderDepartment, v.holderDesignation]
                      .filter(Boolean)
                      .join(" · ");
                    const heldNote = [
                      v.daysHeld != null ? `${v.daysHeld} d` : "",
                      v.assignedBy ? `by ${v.assignedBy}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <tr key={a._id}>
                        <td>{a.id_int ?? from + i}</td>
                        <td>{a.assetTag}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{a.name}</div>
                          {a.serialNumber && (
                            <div
                              className="muted"
                              style={{ fontSize: 12, fontWeight: 400 }}
                            >
                              S/N {a.serialNumber}
                            </div>
                          )}
                        </td>
                        <td>{readableLabel(a.category)}</td>
                        {superAdmin && <td>{v.company}</td>}
                        <td>
                          {v.assigned && v.holderName ? (
                            <div className="company-cell">
                              <PersonAvatar
                                key={v.holderImage || a._id}
                                name={v.holderName}
                                profileImage={v.holderImage}
                                color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                              />
                              <div>
                                <div style={{ fontWeight: 500 }}>
                                  {v.holderName}
                                </div>
                                {(sub || v.holderEmail) && (
                                  <div
                                    className="muted"
                                    style={{ fontSize: 12, fontWeight: 400 }}
                                  >
                                    {sub || v.holderEmail}
                                  </div>
                                )}
                                {heldNote && (
                                  <div
                                    className="muted"
                                    style={{ fontSize: 11.5, fontWeight: 400 }}
                                  >
                                    {heldNote}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="muted">Unassigned</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${statusBadge[a.status] || "warning"}`}
                          >
                            {readableLabel(a.status)}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            {a.status === "available" && (
                              <button
                                className="btn btn-sm primary"
                                onClick={() => setAssigningAsset(a)}
                              >
                                <Icon name="userPlus" size={13} /> Assign
                              </button>
                            )}
                            <button
                              className="btn btn-sm"
                              onClick={() => openEdit(a)}
                            >
                              <Icon name="edit" size={13} /> Edit
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(a)}
                              disabled={v.assigned}
                              title={
                                v.assigned
                                  ? "Return the asset before deleting"
                                  : ""
                              }
                            >
                              <Icon name="trash" size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} assets
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchAssets(pagination.page - 1)}
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
                    onClick={() => fetchAssets(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchAssets(pagination.page + 1)}
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
        <AssetFormModal
          mode={modalMode}
          asset={selected}
          onClose={closeModal}
          onSaved={() => fetchAssets(pagination.page)}
        />
      )}

      {assigningAsset && (
        <AssignAssetModal
          presetAsset={assigningAsset}
          onClose={() => setAssigningAsset(null)}
          onSaved={() => fetchAssets(pagination.page)}
        />
      )}
    </>
  );
}
