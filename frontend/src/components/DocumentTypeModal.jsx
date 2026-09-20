import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { listOptions } from "../services/employeeService";
import {
  createDocumentType,
  updateDocumentType,
} from "../services/documentTypeService";
import { isSuperAdmin } from "../utils/auth";

const idOf = (v) => v?._id || v || "";

export default function DocumentTypeModal({
  mode = "create",
  documentType = null,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit" && !!documentType;
  const superAdmin = isSuperAdmin(); // company admins never pick a company

  const [form, setForm] = useState({
    name: isEdit ? documentType.name || "" : "",
    companyId: isEdit ? idOf(documentType.companyId) : "",
    defaultReminderOffsetsDays: isEdit
      ? documentType.defaultReminderOffsetsDays || []
      : [90, 60, 30, 7, 0],
  });
  const [companies, setCompanies] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then(setCompanies)
      .catch((err) => console.error("Failed to load companies:", err));
  }, [superAdmin]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleReminderChange = (index, value) => {
    const updated = [...form.defaultReminderOffsetsDays];
    updated[index] = Number(value);
    setForm((prev) => ({ ...prev, defaultReminderOffsetsDays: updated }));
  };

  const addReminder = () =>
    setForm((prev) => ({
      ...prev,
      defaultReminderOffsetsDays: [...prev.defaultReminderOffsetsDays, 0],
    }));

  const removeReminder = (index) =>
    setForm((prev) => ({
      ...prev,
      defaultReminderOffsetsDays: prev.defaultReminderOffsetsDays.filter(
        (_, i) => i !== index,
      ),
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Document type name is required.");
      return;
    }
    if (superAdmin && !form.companyId) {
      setError("Please select a company.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      defaultReminderOffsetsDays: form.defaultReminderOffsetsDays,
    };
    // Admins: the backend takes the company from the logged-in user.
    if (superAdmin) payload.companyId = form.companyId;

    try {
      setSaving(true);
      if (isEdit) {
        await updateDocumentType(documentType._id, payload);
      } else {
        await createDocumentType(payload);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save document type",
      );
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: "100%", padding: "9px 12px" };
  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontSize: 12.5,
    color: "var(--text-dim)",
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
          width: 520,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="fileText" size={16} />{" "}
            {isEdit ? "Edit Document Type" : "Add Document Type"}
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

        <p className="muted" style={{ fontSize: 13, margin: "-6px 0 18px" }}>
          Configure the document type and reminder settings.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Document Type Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Passport"
              className="search-box"
              style={inputStyle}
              autoFocus
            />
          </div>

          {superAdmin && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Company *</label>
              <select
                name="companyId"
                value={form.companyId}
                onChange={handleChange}
                className="search-box"
                style={inputStyle}
                disabled={isEdit}
              >
                <option value="">Select a company</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.legalName}
                    {c.tradeName ? ` (${c.tradeName})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Reminder Offsets
              </label>
              <button
                type="button"
                className="btn btn-sm"
                onClick={addReminder}
              >
                <Icon name="plusCircle" size={14} /> Add
              </button>
            </div>

            <p className="muted" style={{ fontSize: 12.5, margin: "0 0 12px" }}>
              Number of days before expiry when the reminder should be sent.
            </p>

            {form.defaultReminderOffsetsDays.map((days, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <input
                  type="number"
                  min="0"
                  value={days}
                  onChange={(e) => handleReminderChange(index, e.target.value)}
                  className="search-box"
                  style={{ flex: 1, padding: "8px 12px" }}
                />
                <span className="muted" style={{ fontSize: 12.5, width: 34 }}>
                  days
                </span>
                <button
                  type="button"
                  className="more-btn"
                  title="Remove reminder"
                  onClick={() => removeReminder(index)}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>

          {error && (
            <p style={{ color: "var(--red)", fontSize: 13, marginTop: 14 }}>
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
            }}
          >
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn primary">
              {saving
                ? "Saving..."
                : isEdit
                  ? "Update Document Type"
                  : "Create Document Type"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
