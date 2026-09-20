import { useState } from "react";
import { Icon } from "./Icon";
import { createUser, updateUser } from "../services/userService";
import { isSuperAdmin } from "../utils/auth";

const ALL_ROLES = ["super_admin", "admin", "hr", "staff"];
const COMPANY_ROLES = ["admin", "hr", "staff"]; // what a company admin may assign
const STATUS_OPTIONS = ["active", "inactive"];

const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  hr: "HR",
  staff: "Staff",
};

const idOf = (v) => v?._id || v || "";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "hr",
  companyId: "",
  status: "active",
  mustResetPassword: false,
};

export default function UserFormModal({
  mode = "create",
  user,
  companies = [],
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";
  const superAdmin = isSuperAdmin();

  // Company admins can never hand out the super_admin role.
  const roleOptions = superAdmin ? ALL_ROLES : COMPANY_ROLES;

  const [form, setForm] = useState(() => {
    if (!isEdit || !user) {
      return { ...emptyForm, role: superAdmin ? "admin" : "hr" };
    }
    return {
      ...emptyForm,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      password: "", // left blank unless the admin wants to reset it
      role: user.role || "hr",
      companyId: idOf(user.companyId),
      status: user.status || "active",
      mustResetPassword: !!user.mustResetPassword,
    };
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  // A super_admin belongs to no company; everyone else needs one.
  const isSuperAdminRole = form.role === "super_admin";
  const showCompany = superAdmin && !isSuperAdminRole;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.firstName || !form.lastName || !form.email) {
      setError("First name, last name and email are required.");
      return;
    }
    if (!isEdit && showCompany && !form.companyId) {
      setError("Please select a company.");
      return;
    }
    if (!isEdit && !form.password) {
      setError("Password is required when creating a user.");
      return;
    }

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      role: form.role,
      status: form.status,
      mustResetPassword: form.mustResetPassword,
    };
    // Admins: the backend puts the user in the admin's own company.
    // Super admin role: no company at all. companyId can't change on edit.
    if (!isEdit && showCompany) payload.companyId = form.companyId;
    if (form.password) payload.password = form.password;

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updateUser(user._id, payload)
        : await createUser(payload);
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

  const inputStyle = { width: "100%", padding: "9px 12px" };
  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontSize: 12.5,
    color: "var(--text-dim)",
  };
  const fieldWrap = { marginBottom: 14 };
  const row2 = { display: "flex", gap: 12, marginBottom: 14 };
  const companyLabel = (c) => c.tradeName || c.legalName;

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
            <Icon name="users" size={16} /> {isEdit ? "Edit User" : "Add User"}
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
          <div
            className="nav-section-title"
            style={{ padding: 0, marginBottom: 10 }}
          >
            User Details
          </div>

          <div style={row2}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>First Name *</label>
              <input
                className="search-box"
                style={inputStyle}
                value={form.firstName}
                onChange={set("firstName")}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Last Name *</label>
              <input
                className="search-box"
                style={inputStyle}
                value={form.lastName}
                onChange={set("lastName")}
              />
            </div>
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Email *</label>
            <input
              type="email"
              className="search-box"
              style={inputStyle}
              value={form.email}
              onChange={set("email")}
              disabled={isEdit}
            />
          </div>

          <div
            className="nav-section-title"
            style={{ padding: 0, margin: "18px 0 10px" }}
          >
            Account Settings
          </div>

          <div style={row2}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Role</label>
              <select
                className="search-box"
                style={inputStyle}
                value={form.role}
                onChange={set("role")}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Status</label>
              <select
                className="search-box"
                style={inputStyle}
                value={form.status}
                onChange={set("status")}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showCompany && (
            <div style={fieldWrap}>
              <label style={labelStyle}>Company *</label>
              <select
                className="search-box"
                style={inputStyle}
                value={form.companyId}
                onChange={set("companyId")}
                disabled={isEdit}
              >
                <option value="">
                  {companies.length
                    ? "Select a company"
                    : "Loading companies..."}
                </option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {companyLabel(c)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {superAdmin && isSuperAdminRole && (
            <p
              className="muted"
              style={{ fontSize: 12.5, margin: "-4px 0 14px" }}
            >
              Super admins are not tied to a company.
            </p>
          )}

          <div style={fieldWrap}>
            <label style={labelStyle}>
              {isEdit ? "New Password (optional)" : "Password *"}
            </label>
            <input
              type="text"
              className="search-box"
              style={inputStyle}
              value={form.password}
              onChange={set("password")}
              placeholder={
                isEdit
                  ? "Leave blank to keep current password"
                  : "At least 8 characters"
              }
            />
          </div>

          <div
            style={{
              ...fieldWrap,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <input
              type="checkbox"
              id="mustResetPassword"
              checked={form.mustResetPassword}
              onChange={set("mustResetPassword")}
            />
            <label
              htmlFor="mustResetPassword"
              style={{ ...labelStyle, marginBottom: 0 }}
            >
              Require password reset on next login
            </label>
          </div>

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
            <button type="submit" disabled={submitting} className="btn primary">
              {submitting
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
