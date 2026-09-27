import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { isSuperAdmin, getCurrentUser } from "../utils/auth";
import StatCard from "../components/StatCard";
import DocumentFormModal from "../components/DocumentFormModal";
import { listOptions } from "../services/employeeService";
import { getDocuments, deleteDocument } from "../services/documentService";
import { assetUrl } from "../services/uploadService";

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const byId = (rows) => Object.fromEntries(rows.map((r) => [r._id, r]));

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

const statusBadge = {
  active: "success",
  expired: "plan-business",
  pending: "warning",
};

export default function Documents() {
  const superAdmin = isSuperAdmin();
  const me = getCurrentUser();
  const isStaff = me?.role === "staff";

  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [lookups, setLookups] = useState({
    users: {},
    employees: {},
    documentTypes: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalMode, setModalMode] = useState(null); // "create" | "reupload" | null
  const [selected, setSelected] = useState(null);

  const loadLookups = async () => {
    try {
      const [users, employees, documentTypes] = (
        await Promise.allSettled([
          isStaff ? Promise.resolve([]) : listOptions("users"),
          isStaff ? Promise.resolve([]) : listOptions("employees"),
          listOptions("document-types"),
        ])
      ).map((r) => (r.status === "fulfilled" ? r.value : []));
      setLookups({
        users: byId(users),
        employees: byId(employees),
        documentTypes: byId(documentTypes),
      });
    } catch {
      /* names just fall back to "-" */
    }
  };

  const fetchDocuments = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = [];
      if (statusFilter !== "all") {
        fields.push({ field: "status", operator: "eq", value: statusFilter });
      }
      const result = await getDocuments({ page, limit: 20, fields });
      setDocuments(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDocuments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const view = (d) => {
    const employee =
      typeof d.employeeId === "object"
        ? d.employeeId
        : lookups.employees[d.employeeId];
    const user =
      typeof employee?.userId === "object"
        ? employee.userId
        : lookups.users[employee?.userId];
    const docType =
      typeof d.documentTypeId === "object"
        ? d.documentTypeId
        : lookups.documentTypes[d.documentTypeId];
    return {
      employeeName: fullName(user) || "-",
      typeName: docType?.name || "-",
    };
  };

  const rows = useMemo(
    () => documents.map((d) => ({ d, v: view(d) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [documents, lookups],
  );

  const filtered = rows.filter(({ d, v }) => {
    const q = search.toLowerCase();
    return (
      d.fileName?.toLowerCase().includes(q) ||
      v.employeeName.toLowerCase().includes(q) ||
      v.typeName.toLowerCase().includes(q)
    );
  });

  const expiredCount = documents.filter((d) => d.status === "expired").length;

  const openCreate = () => {
    setSelected(null);
    setModalMode("create");
  };
  const openReupload = (d) => {
    setSelected(d);
    setModalMode("reupload");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Delete "${d.fileName}"? This cannot be undone.`))
      return;
    try {
      await deleteDocument(d._id);
      fetchDocuments(pagination.page);
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
        <span className="current">
          {isStaff ? "My Documents" : "Documents"}
        </span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>{isStaff ? "My Documents" : "Documents"}</h1>
          <p>
            {isStaff
              ? "Upload and manage your personal documents."
              : "Manage employee documents across the company."}
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          Upload Document
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="fileText"
          label="Total Documents"
          value={pagination.total}
        />
        <StatCard
          tone="orange"
          icon="clock"
          label="Expired (this page)"
          value={expiredCount}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Document Records</h2>
            <p>A list of all documents visible to your role.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search by file name, employee or type..."
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
              <option value="all">Filter: All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading documents...
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
                    <th>File Name</th>
                    {!isStaff && <th>Employee</th>}
                    <th>Type</th>
                    <th>Version</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={isStaff ? 7 : 8}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No documents found. Upload one or change the filter.
                      </td>
                    </tr>
                  )}
                  {filtered.map(({ d, v }, i) => (
                    <tr key={d._id}>
                      <td>{d.id_int ?? from + i}</td>
                      <td>{d.fileName}</td>
                      {!isStaff && <td>{v.employeeName}</td>}
                      <td>{v.typeName}</td>
                      <td>v{d.version}</td>
                      <td>{formatDate(d.expiryDate)}</td>
                      <td>
                        <span
                          className={`badge ${statusBadge[d.status] || "warning"}`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                        >
                          <a
                            className="btn btn-sm"
                            href={assetUrl(d.fileUrl)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Icon name="eye" size={13} /> View
                          </a>
                          <button
                            className="btn btn-sm"
                            onClick={() => openReupload(d)}
                          >
                            <Icon name="edit" size={13} /> New Version
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
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} documents
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchDocuments(pagination.page - 1)}
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
                    onClick={() => fetchDocuments(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchDocuments(pagination.page + 1)}
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
        <DocumentFormModal
          mode={modalMode}
          document={selected}
          onClose={closeModal}
          onSaved={() => fetchDocuments(pagination.page)}
        />
      )}
    </>
  );
}
