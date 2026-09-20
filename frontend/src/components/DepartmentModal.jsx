import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { listOptions } from "../services/employeeService";
import {
  createDepartment,
  updateDepartment,
} from "../services/departmentService";
import { isSuperAdmin } from "../utils/auth";

const idOf = (v) => v?._id || v || "";

export default function DepartmentModal({
  mode = "create",
  department = null,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit" && !!department;
  const superAdmin = isSuperAdmin(); // company admins never pick a company

  const [form, setForm] = useState({
    name: isEdit ? department.name || "" : "",
    companyId: isEdit ? idOf(department.companyId) : "",
  });
  const [companies, setCompanies] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Only a super admin needs the company list.
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Department name is required.");
      return;
    }
    if (superAdmin && !form.companyId) {
      setError("Please select a company.");
      return;
    }

    const payload = { name: form.name.trim() };
    // Admins: the backend takes the company from the logged-in user.
    if (superAdmin) payload.companyId = form.companyId;

    try {
      setSaving(true);
      if (isEdit) {
        await updateDepartment(department._id, payload);
      } else {
        await createDepartment(payload);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save department",
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
          width: 460,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="briefcase" size={16} />{" "}
            {isEdit ? "Edit Department" : "Add Department"}
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
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Department Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Engineering"
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

          {error && (
            <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 8,
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
                  ? "Update Department"
                  : "Create Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
