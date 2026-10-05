import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { isSuperAdmin } from "../utils/auth";
import StatCard from "../components/StatCard";
import StatutoryDetailFormModal from "../components/StatutoryDetailFormModal";
import { FILE_BASE } from "../config";
import {
  getStatutoryDetails,
  deleteStatutoryDetail,
} from "../services/statutoryDetailService";

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

// Everything comes from the list response; the nested populated objects are
// kept as a fallback.
const view = (d) => {
  const emp = typeof d.employeeId === "object" ? d.employeeId : null;
  const user = emp && typeof emp.userId === "object" ? emp.userId : null;
  const company = typeof d.companyId === "object" ? d.companyId : null;
  const nestedName = user
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : "";
  return {
    employeeName: d.employeeName || nestedName || "-",
    email: d.email || user?.email || "",
    department: d.department || emp?.departmentId?.name || "",
    designation: d.designation || emp?.designationId?.name || "",
    profileImage: d.profileImage || user?.profileImage || null,
    company: d.companyName || company?.legalName || company?.tradeName || "-",
  };
};

export default function StatutoryDetails() {
  const superAdmin = isSuperAdmin();
  const [details, setDetails] = useState([]);
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

  const fetchDetails = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const result = await getStatutoryDetails({ page, limit: 20, fields: [] });
      setDetails(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails(1);
  }, []);

  const rows = useMemo(
    () => details.map((d) => ({ d, v: view(d) })),
    [details],
  );

  const filtered = rows.filter(({ d, v }) => {
    const q = search.toLowerCase();
    return (
      v.employeeName.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      v.department.toLowerCase().includes(q) ||
      v.company.toLowerCase().includes(q) ||
      d.panNumber?.toLowerCase().includes(q) ||
      d.bankName?.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setSelected(null);
    setModalMode("create");
  };

  // The list now returns Aadhaar and the bank account number already masked.
  // They are removed here so the form can never save a masked value back
  // over the real one.
  const openEdit = (d) => {
    const { aadhaarNumber, bankAccountNumber, ...rest } = d;
    setSelected(rest);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
  };

  const handleDelete = async (d, name) => {
    if (
      !window.confirm(
        `Delete statutory details for ${name}? This cannot be undone.`,
      )
    )
      return;
    try {
      await deleteStatutoryDetail(d._id);
      fetchDetails(pagination.page);
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
        <span>Payroll</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Statutory Details</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Employee Statutory Details</h1>
          <p>
            PAN, UAN, PF, ESI and bank details for payroll compliance. Aadhaar
            and account numbers are never shown in full.
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          Add Statutory Details
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="fileText"
          label="Total Records"
          value={pagination.total}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Statutory Records</h2>
            <p>
              A list of all employee statutory details visible to your role.
            </p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search by employee, department, PAN or bank..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading statutory details...
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
                    <th>PAN</th>
                    <th>Aadhaar</th>
                    <th>UAN</th>
                    <th>PF Number</th>
                    <th>ESI Number</th>
                    <th>Bank</th>
                    <th>Account No.</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={superAdmin ? 11 : 10}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No statutory records found. Add one to get started.
                      </td>
                    </tr>
                  )}
                  {filtered.map(({ d, v }, i) => {
                    const sub = [v.department, v.designation]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <tr key={d._id}>
                        <td>{d.id_int ?? from + i}</td>
                        <td>
                          <div className="company-cell">
                            <PersonAvatar
                              key={v.profileImage || d._id}
                              name={v.employeeName}
                              profileImage={v.profileImage}
                              color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                            />
                            <div>
                              <div style={{ fontWeight: 500 }}>
                                {v.employeeName}
                              </div>
                              {(sub || v.email) && (
                                <div
                                  className="muted"
                                  style={{ fontSize: 12, fontWeight: 400 }}
                                >
                                  {sub || v.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        {superAdmin && <td>{v.company}</td>}
                        <td>{d.panNumber || "-"}</td>
                        <td>{d.aadhaarNumber || "-"}</td>
                        <td>{d.uanNumber || "-"}</td>
                        <td>{d.pfNumber || "-"}</td>
                        <td>{d.esiNumber || "-"}</td>
                        <td>{d.bankName || "-"}</td>
                        <td>{d.bankAccountNumber || "-"}</td>
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
                              onClick={() => handleDelete(d, v.employeeName)}
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
                Showing {from}–{to} of {pagination.total} records
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchDetails(pagination.page - 1)}
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
                    onClick={() => fetchDetails(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchDetails(pagination.page + 1)}
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
        <StatutoryDetailFormModal
          mode={modalMode}
          detail={selected}
          onClose={closeModal}
          onSaved={() => fetchDetails(pagination.page)}
        />
      )}
    </>
  );
}
