import { useRef, useState } from "react";
import { Icon } from "./Icon";
import {
  createUser,
  updateUser,
  uploadProfileImage,
} from "../services/userService";
import { isSuperAdmin } from "../utils/auth";

const ALL_ROLES = ["super_admin", "admin", "hr", "staff"];
const COMPANY_ROLES = ["admin", "hr", "staff"];
const STATUS_OPTIONS = ["active", "inactive"];
const FILE_BASE = "http://localhost:5000";
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

  const roleOptions = superAdmin ? ALL_ROLES : COMPANY_ROLES;

  const [form, setForm] = useState(() => {
    if (!isEdit || !user) {
      return {
        ...emptyForm,
        role: superAdmin ? "admin" : "hr",
      };
    }

    return {
      ...emptyForm,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      password: "",
      role: user.role || "hr",
      companyId: idOf(user.companyId),
      status: user.status || "active",
      mustResetPassword: !!user.mustResetPassword,
    };
  });

  // Profile image state
  const [profileImage, setProfileImage] = useState(null);

  const [profilePreview, setProfilePreview] = useState(
    user?.profileImage ? `${FILE_BASE}${user.profileImage}` : null,
  );

  const fileInputRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;

    setForm((f) => ({
      ...f,
      [key]: value,
    }));
  };

  const isSuperAdminRole = form.role === "super_admin";

  const showCompany = superAdmin && !isSuperAdminRole;

  // Profile image selection
  const handleProfileImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");

    // Validate type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG or WebP image.");
      return;
    }

    // Validate size - 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile image must be smaller than 5MB.");
      return;
    }

    setProfileImage(file);

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setProfilePreview(previewUrl);
  };

  const removeProfileImage = () => {
    setProfileImage(null);

    // If editing and existing image exists,
    // keep the existing image unless backend supports deletion.
    setProfilePreview(user?.profileImage || null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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

    // Company can only be selected when creating
    // a user by super admin.
    if (!isEdit && showCompany) {
      payload.companyId = form.companyId;
    }

    if (form.password) {
      payload.password = form.password;
    }

    try {
      setSubmitting(true);

      // First create/update the normal user data
      const result = isEdit
        ? await updateUser(user._id, payload)
        : await createUser(payload);

      const savedUser = result.data.data;

      // Then upload profile image if one was selected
      if (profileImage) {
        await uploadProfileImage(savedUser._id, profileImage);
      }

      onSaved(savedUser);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
  };

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontSize: 12.5,
    color: "var(--text-dim)",
  };

  const fieldWrap = {
    marginBottom: 14,
  };

  const row2 = {
    display: "flex",
    gap: 12,
    marginBottom: 14,
  };

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
        {/* Header */}
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
              style={{
                transform: "rotate(45deg)",
              }}
            />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* USER DETAILS */}
          <div
            className="nav-section-title"
            style={{
              padding: 0,
              marginBottom: 10,
            }}
          >
            User Details
          </div>

          {/* PROFILE IMAGE */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 0 18px",
              marginBottom: 4,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 78,
                height: 78,
                borderRadius: "50%",
                overflow: "hidden",
                background: "var(--bg-soft)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {profilePreview ? (
                <img
                  src={profilePreview}
                  alt="Profile preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <Icon name="users" size={30} />
              )}
            </div>

            {/* Upload controls */}
            <div>
              <label style={labelStyle}>Profile Photo</label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleProfileImageChange}
                style={{ display: "none" }}
              />

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {profilePreview ? "Change Photo" : "Upload Photo"}
                </button>

                {profileImage && (
                  <button
                    type="button"
                    className="btn"
                    onClick={removeProfileImage}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div
                className="muted"
                style={{
                  fontSize: 11.5,
                  marginTop: 6,
                }}
              >
                JPG, PNG or WebP · Maximum 5MB
              </div>
            </div>
          </div>

          {/* FIRST / LAST NAME */}
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

          {/* EMAIL */}
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

          {/* ACCOUNT SETTINGS */}
          <div
            className="nav-section-title"
            style={{
              padding: 0,
              margin: "18px 0 10px",
            }}
          >
            Account Settings
          </div>

          {/* ROLE / STATUS */}
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

          {/* COMPANY */}
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

          {/* SUPER ADMIN MESSAGE */}
          {superAdmin && isSuperAdminRole && (
            <p
              className="muted"
              style={{
                fontSize: 12.5,
                margin: "-4px 0 14px",
              }}
            >
              Super admins are not tied to a company.
            </p>
          )}

          {/* PASSWORD */}
          <div style={fieldWrap}>
            <label style={labelStyle}>
              {isEdit ? "New Password (optional)" : "Password *"}
            </label>

            <input
              type="password"
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

          {/* RESET PASSWORD */}
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
              style={{
                ...labelStyle,
                marginBottom: 0,
              }}
            >
              Require password reset on next login
            </label>
          </div>

          {/* ERROR */}
          {error && (
            <p
              style={{
                color: "var(--red)",
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              {error}
            </p>
          )}

          {/* ACTIONS */}
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
