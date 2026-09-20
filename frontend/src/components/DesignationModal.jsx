import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { listOptions } from "../services/employeeService";
import {
  createDesignation,
  updateDesignation,
} from "../services/designationService";
import { isSuperAdmin } from "../utils/auth";

const idOf = (v) => v?._id || v || "";

export default function DesignationModal({
  mode = "create",
  designation = null,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit" && !!designation;
  const superAdmin = isSuperAdmin(); // company admins never pick a company

  const [form, setForm] = useState({
    name: isEdit ? designation.name || "" : "",
    companyId: isEdit ? idOf(designation.companyId) : "",
    departmentId: isEdit ? idOf(designation.departmentId) : "",
  });
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then(setCompanies)
      .catch((err) => console.error("Failed to load companies:", err));
  }, [superAdmin]);

  // Super admin: departments of the chosen company.
  // Admin: the backend already limits departments to their own company.
  const ready = superAdmin ? !!form.companyId : true;

  useEffect(() => {
    if (!ready) {
      setDepartments([]);
      return;
    }
    listOptions("departments", superAdmin ? form.companyId : undefined)
      .then(setDepartments)
      .catch((err) => console.error("Failed to load departments:", err));
  }, [ready, superAdmin, form.companyId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "companyId" ? { departmentId: "" } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Designation name is required.");
      return;
    }
    if (superAdmin && !form.companyId) {
      setError("Please select a company.");
      return;
    }
    if (!form.departmentId) {
      setError("Please select a department.");
      return;
    }

    const payload = { name: form.name.trim(), departmentId: form.departmentId };
    // Admins: the backend takes the company from the logged-in user.
    if (superAdmin) payload.companyId = form.companyId;

    try {
      setSaving(true);
      if (isEdit) {
        await updateDesignation(designation._id, payload);
      } else {
        await createDesignation(payload);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save designation",
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
          width: 480,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="briefcase" size={16} />{" "}
            {isEdit ? "Edit Designation" : "Add Designation"}
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
            <label style={labelStyle}>Designation Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Associate Engineer"
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

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Department *</label>
            <select
              name="departmentId"
              value={form.departmentId}
              onChange={handleChange}
              className="search-box"
              style={inputStyle}
              disabled={!ready}
            >
              <option value="">
                {ready ? "Select a department" : "Select a company first"}
              </option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

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
                  ? "Update Designation"
                  : "Create Designation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
