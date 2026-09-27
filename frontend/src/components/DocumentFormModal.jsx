import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Section, Row, Field, inputStyle } from "./FormParts";
import { getCurrentUser } from "../utils/auth";
import { listOptions } from "../services/employeeService";
import { uploadLogo, assetUrl } from "../services/uploadService"; // reusing the same file-upload helper Companies uses
import { uploadDocument, reuploadDocument } from "../services/documentService";

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");

const emptyForm = {
  employeeId: "",
  documentTypeId: "",
  fileUrl: "",
  fileName: "",
  expiryDate: "",
};

export default function DocumentFormModal({
  mode = "create", // "create" | "reupload"
  document,
  onClose,
  onSaved,
}) {
  const isReupload = mode === "reupload";
  const me = getCurrentUser();
  const isStaff = me?.role === "staff"; // staff always uploads against their own employeeId

  const [form, setForm] = useState(() => {
    if (isReupload && document) {
      return {
        employeeId: idOf(document.employeeId),
        documentTypeId: idOf(document.documentTypeId),
        fileUrl: "", // new file required for the new version
        fileName: document.fileName || "",
        expiryDate: document.expiryDate?.slice(0, 10) || "",
      };
    }
    return { ...emptyForm };
  });

  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Employee dropdown for admin/hr/super admin only — staff always upload
  // against their own employeeId, resolved server-side.
  useEffect(() => {
    if (isStaff) {
      // Document types are still needed even for staff.
      listOptions("document-types")
        .then(setDocumentTypes)
        .catch((err) => setError(err.response?.data?.message || err.message));
      return;
    }
    let cancelled = false;
    setLoadingLookups(true);
    Promise.all([
      listOptions("users"),
      listOptions("employees"),
      listOptions("document-types"),
    ])
      .then(([u, e, types]) => {
        if (!cancelled) {
          setUsers(u);
          setEmployees(e);
          setDocumentTypes(types);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      })
      .finally(() => !cancelled && setLoadingLookups(false));
    return () => {
      cancelled = true;
    };
  }, [isStaff]);

  const usersById = Object.fromEntries(users.map((u) => [u._id, u]));

  const onFilePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File must be 10 MB or smaller.");
      return;
    }

    try {
      setError("");
      setUploading(true);
      const url = await uploadLogo(file); // generic file-upload endpoint — adjust if your uploadService has a dedicated document uploader
      setForm((f) => ({
        ...f,
        fileUrl: url,
        fileName: f.fileName || file.name,
      }));
    } catch (err) {
      setError(err.response?.data?.message || "File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      (!isStaff && !form.employeeId) ||
      !form.documentTypeId ||
      !form.fileUrl ||
      !form.fileName.trim()
    ) {
      setError("Please fill in all required fields (marked *).");
      return;
    }

    const payload = {
      documentTypeId: form.documentTypeId,
      fileUrl: form.fileUrl,
      fileName: form.fileName.trim(),
      expiryDate: form.expiryDate || undefined,
    };
    if (!isStaff && !isReupload) payload.employeeId = form.employeeId; // ignored server-side for staff; not sent on reupload since it can't change owner

    try {
      setSubmitting(true);
      const result = isReupload
        ? await reuploadDocument(document._id, payload)
        : await uploadDocument(payload);
      onSaved(result.data.data);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Something went wrong",
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
          width: 560,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="fileText" size={16} />{" "}
            {isReupload ? "Upload New Version" : "Upload Document"}
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
          <Section title="Document" first />
          <Row>
            {!isStaff && (
              <Field label="Employee *">
                <select
                  className="search-box"
                  style={inputStyle}
                  value={form.employeeId}
                  onChange={set("employeeId")}
                  disabled={isReupload}
                >
                  <option value="">
                    {loadingLookups ? "Loading..." : "Select employee"}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {fullName(usersById[idOf(emp.userId)]) ||
                        `Employee #${emp.id_int ?? ""}`}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Document Type *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.documentTypeId}
                onChange={set("documentTypeId")}
                disabled={isReupload}
              >
                <option value="">
                  {loadingLookups ? "Loading..." : "Select document type"}
                </option>
                {documentTypes.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          </Row>

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 12.5,
                color: "var(--text-dim)",
              }}
            >
              File *
            </label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <label
                className="btn btn-sm"
                style={{ cursor: uploading ? "wait" : "pointer" }}
              >
                {uploading
                  ? "Uploading..."
                  : form.fileUrl
                    ? "Change file"
                    : "Choose file"}
                <input
                  type="file"
                  onChange={onFilePick}
                  disabled={uploading}
                  hidden
                />
              </label>
              {form.fileUrl && (
                <span className="muted" style={{ fontSize: 12.5 }}>
                  <Icon name="check" size={12} />{" "}
                  {form.fileName || "File attached"}
                </span>
              )}
            </div>
          </div>

          <Row>
            <Field label="File Name *">
              <input
                type="text"
                className="search-box"
                style={inputStyle}
                value={form.fileName}
                onChange={set("fileName")}
                placeholder="e.g. citizenship_front.pdf"
              />
            </Field>
            <Field label="Expiry Date">
              <input
                type="date"
                className="search-box"
                style={inputStyle}
                value={form.expiryDate}
                onChange={set("expiryDate")}
              />
            </Field>
          </Row>

          {isReupload && (
            <p
              className="muted"
              style={{ fontSize: 12, marginTop: -6, marginBottom: 14 }}
            >
              This creates a new version linked to the previous one — the old
              file stays on record.
            </p>
          )}

          {error && (
            <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="btn primary"
            >
              {submitting
                ? "Saving..."
                : isReupload
                  ? "Upload New Version"
                  : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
