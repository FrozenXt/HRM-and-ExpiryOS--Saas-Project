import { useEffect, useState } from "react";
import { getDocumentTypes } from "../services/documentTypeService";
import { listOptions } from "../services/employeeService";
import { Icon } from "../components/Icon";
import DocumentTypeModal from "../components/DocumentTypeModal";
import { isSuperAdmin } from "../utils/auth";

const idOf = (v) => v?._id || v || "";

export default function DocumentTypes() {
  const superAdmin = isSuperAdmin();

  const [documentTypes, setDocumentTypes] = useState([]);
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
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);

  const fetchDocumentTypes = async (page = 1) => {
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

      const result = await getDocumentTypes({
        page,
        limit: 20,
        sort: "ASC",
        sort_field: "name",
        fields,
      });
      setDocumentTypes(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch document types",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentTypes(1);
    if (superAdmin)
      listOptions("companies")
        .then(setCompanies)
        .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const companyName = (doc) => {
    if (!doc.companyId) return "Global";
    return (
      doc.companyId?.legalName ||
      companies.find((c) => c._id === idOf(doc.companyId))?.legalName ||
      "-"
    );
  };

  const openCreate = () => {
    setSelectedDocumentType(null);
    setModalMode("create");
  };
  const openEdit = (doc) => {
    setSelectedDocumentType(doc);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelectedDocumentType(null);
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
        <span className="current">Document Types</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Document Types</h1>
          <p>Manage document types and expiry reminder settings.</p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          Add Document Type
        </button>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Document Types</h2>
            <p>Types of documents employees and companies can upload.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search document types..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchDocumentTypes(1)}
              />
            </div>
            <button className="btn" onClick={() => fetchDocumentTypes(1)}>
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading document types...
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
                    <th>Reminder Offsets</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documentTypes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={superAdmin ? 6 : 5}
                        style={{ textAlign: "center", padding: 28 }}
                        className="muted"
                      >
                        No document types found. Add one to get started.
                      </td>
                    </tr>
                  ) : (
                    documentTypes.map((doc) => (
                      <tr key={doc._id}>
                        <td>{doc.id_int ?? "-"}</td>
                        <td style={{ fontWeight: 500 }}>{doc.name}</td>
                        {superAdmin && <td>{companyName(doc)}</td>}
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: 5,
                              flexWrap: "wrap",
                            }}
                          >
                            {(doc.defaultReminderOffsetsDays || []).map(
                              (days) => (
                                <span
                                  key={days}
                                  className="badge plan-business"
                                >
                                  {days}d
                                </span>
                              ),
                            )}
                          </div>
                        </td>
                        <td className="muted">
                          {doc.createdAt
                            ? new Date(doc.createdAt).toLocaleDateString()
                            : "-"}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm"
                            onClick={() => openEdit(doc)}
                          >
                            <Icon name="edit" size={13} /> Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} document types
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchDocumentTypes(pagination.page - 1)}
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
                    onClick={() => fetchDocumentTypes(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchDocumentTypes(pagination.page + 1)}
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
        <DocumentTypeModal
          mode={modalMode}
          documentType={selectedDocumentType}
          onClose={closeModal}
          onSaved={() => fetchDocumentTypes(pagination.page)}
        />
      )}
    </>
  );
}
