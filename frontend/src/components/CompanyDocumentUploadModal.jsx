import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { labelStyle, inputStyle } from "./FormParts";
import {
  createCompanyDocument,
  uploadDocumentFile,
} from "../services/companyDocumentService";
import { listOptions } from "../services/employeeService";
import { isSuperAdmin } from "../utils/auth";

const DOC_TYPES = [
  { value: "registration_certificate", label: "Registration Certificate" },
  { value: "tax_certificate", label: "Tax Certificate" },
  { value: "address_proof", label: "Address Proof" },
  { value: "authorized_signatory_id", label: "Authorized Signature ID" },
  //   { value: "agreement", label: "Agreement" },
  { value: "other", label: "Other" },
];

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";
const ALLOWED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];
const MAX_MB = 10;

const formatSize = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function CompanyDocumentUploadModal({ onClose, onSaved }) {
  const superAdmin = isSuperAdmin();

  const [companyId, setCompanyId] = useState("");
  const [companies, setCompanies] = useState([]);
  const [type, setType] = useState("registration_certificate");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then(setCompanies)
      .catch(() => {});
  }, [superAdmin]);

  const pickFile = async (e) => {
    const raw = e.target.files?.[0];
    e.target.value = "";
    if (!raw) return;
    setError("");

    if (!ALLOWED_MIME.includes(raw.type)) {
      setError("Only PDF, PNG, JPG or WEBP files are allowed.");
      return;
    }
    if (raw.size > MAX_MB * 1024 * 1024) {
      setError(`File must be ${MAX_MB} MB or smaller.`);
      return;
    }

    try {
      setUploading(true);
      const uploaded = await uploadDocumentFile(raw);
      setFile(uploaded);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (superAdmin && !companyId) return setError("Please select a company.");
    if (!file) return setError("Please upload a file.");

    const payload = {
      type,
      fileUrl: file.url,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    };
    if (superAdmin) payload.companyId = companyId;

    try {
      setSubmitting(true);
      await createCompanyDocument(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to upload document",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{
          width: 480,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="fileText" size={16} /> Upload Document
          </h2>
          <button
            type="button"
            className="more-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon
              name="chevronRight"
              size={16}
              style={{ transform: "rotate(45deg)" }}
            />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {superAdmin && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Company *</label>
              <select
                className="search-box"
                style={inputStyle}
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              >
                <option value="">Select a company</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.legalName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Document Type *</label>
            <select
              className="search-box"
              style={inputStyle}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>File *</label>
            <div
              style={{
                border: "1px dashed var(--border)",
                borderRadius: 10,
                padding: 16,
                background: "var(--surface-2)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9,
                  background: "var(--blue-soft)",
                  color: "var(--blue)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="fileText" size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {file ? (
                  <>
                    <div
                      style={{
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {file.fileName}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {formatSize(file.sizeBytes)}
                    </div>
                  </>
                ) : (
                  <div className="muted" style={{ fontSize: 13 }}>
                    PDF, PNG, JPG or WEBP — up to {MAX_MB} MB
                  </div>
                )}
              </div>
              <label
                className="btn btn-sm"
                style={{
                  cursor: uploading ? "wait" : "pointer",
                  flexShrink: 0,
                }}
              >
                {uploading ? "Uploading..." : file ? "Replace" : "Choose file"}
                <input
                  type="file"
                  accept={ACCEPT}
                  onChange={pickFile}
                  disabled={uploading}
                  hidden
                />
              </label>
            </div>
          </div>

          {error && (
            <p
              style={{ color: "var(--red)", fontSize: 13, margin: "14px 0 0" }}
            >
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
            }}
          >
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploading || !file}
              className="btn primary"
            >
              {submitting ? "Saving..." : "Upload Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
