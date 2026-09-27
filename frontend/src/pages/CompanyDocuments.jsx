import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import CompanyDocumentUploadModal from "../components/CompanyDocumentUploadModal";
import CompanyDocumentReviewModal from "../components/CompanyDocumentReviewModal";
import {
  getCompanyDocuments,
  deleteCompanyDocument,
  assetUrl,
} from "../services/companyDocumentService";
import { listOptions } from "../services/employeeService";
import { isSuperAdmin, getCurrentUser } from "../utils/auth";

const idOf = (v) => v?._id || v || "";
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

const formatSize = (bytes) => {
  if (bytes == null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const TYPE_LABEL = {
  registration_certificate: "Registration Certificate",
  tax_certificate: "Tax Certificate",
  address_proof: "Address Proof",
  authorized_signature_id: "Authorized Signature ID",
  //   agreement: "Agreement",
  other: "Other",
};

const STATUS_BADGE = {
  pending_review: "plan-business",
  approved: "success",
  rejected: "warning",
};

const fileIcon = (mimeType = "") =>
  mimeType.includes("pdf") ? "fileText" : "eye";

export default function CompanyDocuments() {
  const superAdmin = isSuperAdmin();
  const role = getCurrentUser()?.role || "";
  const canReview = role === "admin" || role === "hr" || role === "super_admin";

  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [reviewing, setReviewing] = useState(null);

  const fetchRows = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = [];
      if (statusFilter)
        fields.push({ field: "status", operator: "eq", value: statusFilter });
      if (typeFilter)
        fields.push({ field: "type", operator: "eq", value: typeFilter });
      const res = await getCompanyDocuments({ page, limit: 20, fields });
      setRows(res.data.data.data || []);
      setPagination(
        res.data.data.pagination || {
          page,
          limit: 20,
          total: 0,
          total_pages: 1,
        },
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load documents",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    if (superAdmin)
      listOptions("companies")
        .then(setCompanies)
        .catch(() => {});
  }, [superAdmin]);

  const companyName = (doc) =>
    doc.companyId?.legalName ||
    companies.find((c) => c._id === idOf(doc.companyId))?.legalName ||
    "-";

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.fileName}"? This cannot be undone.`))
      return;
    try {
      await deleteCompanyDocument(doc._id);
      fetchRows(pagination.page);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete document",
      );
    }
  };

  const count = (status) => rows.filter((d) => d.status === status).length;
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
        <span className="current">Company Documents</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Company Documents</h1>
          <p>
            {superAdmin
              ? "Review and manage documents uploaded across all companies."
              : "Upload and track your company's compliance documents."}
          </p>
        </div>
        <button className="btn primary" onClick={() => setShowUpload(true)}>
          <Icon name="plusCircle" size={17} /> Upload Document
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="fileText"
          label="Total (this page)"
          value={rows.length}
        />
        <StatCard
          tone="orange"
          icon="clock"
          label="Pending review"
          value={count("pending_review")}
        />
        <StatCard
          tone="green"
          icon="userCheck"
          label="Approved"
          value={count("approved")}
        />
        <StatCard
          tone="purple"
          icon="list"
          label="Rejected"
          value={count("rejected")}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Documents</h2>
            <p>
              {superAdmin ? "All companies." : "Documents for your company."}
            </p>
          </div>
          <div className="panel-tools">
            <select
              className="lang-btn"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by type"
            >
              <option value="">Type: All</option>
              {Object.entries(TYPE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              className="lang-btn"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">Status: All</option>
              <option value="pending_review">Pending review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
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
                    <th>Document</th>
                    {superAdmin && <th>Company</th>}
                    <th>Type</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={superAdmin ? 7 : 6}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No documents found. Upload one to get started.
                      </td>
                    </tr>
                  )}
                  {rows.map((doc) => (
                    <tr key={doc._id}>
                      <td>
                        <div className="company-cell">
                          <span
                            className="co-avatar"
                            style={{
                              background: "var(--blue-soft)",
                              color: "var(--blue)",
                              borderRadius: 8,
                            }}
                          >
                            <Icon name={fileIcon(doc.mimeType)} size={15} />
                          </span>
                          <a
                            href={assetUrl(doc.fileUrl)}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: "var(--blue)",
                              maxWidth: 220,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "inline-block",
                            }}
                            title={doc.fileName}
                          >
                            {doc.fileName}
                          </a>
                        </div>
                      </td>
                      {superAdmin && <td>{companyName(doc)}</td>}
                      <td>{TYPE_LABEL[doc.type] || doc.type}</td>
                      <td className="muted">{formatSize(doc.sizeBytes)}</td>
                      <td className="muted">{fmtDate(doc.createdAt)}</td>
                      <td>
                        <span
                          className={`badge ${STATUS_BADGE[doc.status] || "plan-default"}`}
                        >
                          {doc.status === "pending_review"
                            ? "Pending review"
                            : doc.status
                              ? doc.status[0].toUpperCase() +
                                doc.status.slice(1)
                              : "-"}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                        >
                          {canReview && doc.status === "pending_review" && (
                            <button
                              className="btn btn-sm primary"
                              onClick={() => setReviewing(doc)}
                            >
                              <Icon name="userCheck" size={13} /> Review
                            </button>
                          )}
                          <a
                            className="btn btn-sm"
                            href={assetUrl(doc.fileUrl)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Icon name="eye" size={13} /> View
                          </a>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(doc)}
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

      {showUpload && (
        <CompanyDocumentUploadModal
          onClose={() => setShowUpload(false)}
          onSaved={() => fetchRows(1)}
        />
      )}
      {reviewing && (
        <CompanyDocumentReviewModal
          document={reviewing}
          onClose={() => setReviewing(null)}
          onSaved={() => fetchRows(pagination.page)}
        />
      )}
    </>
  );
}
