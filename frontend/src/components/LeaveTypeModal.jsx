import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Row, Field, inputStyle, labelStyle } from "./FormParts";
import { listOptions } from "../services/employeeService";
import { createLeaveType, updateLeaveType } from "../services/leaveTypeService";
import { isSuperAdmin } from "../utils/auth";

const idOf = (v) => v?._id || v || "";

export default function LeaveTypeModal({
  mode = "create",
  leaveType = null,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit" && !!leaveType;
  const superAdmin = isSuperAdmin();

  const [form, setForm] = useState({
    name: isEdit ? leaveType.name || "" : "",
    annualQuota: isEdit ? (leaveType.annualQuota ?? "") : "",
    carryForward: isEdit ? !!leaveType.carryForward : false,
    companyId: isEdit ? idOf(leaveType.companyId) : "",
  });
  const [companies, setCompanies] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then(setCompanies)
      .catch(() => {});
  }, [superAdmin]);

  const set = (key) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Leave type name is required.");
    if (form.annualQuota === "" || Number(form.annualQuota) < 0)
      return setError("Enter a valid annual quota.");
    if (superAdmin && !form.companyId)
      return setError("Please select a company.");

    const payload = {
      name: form.name.trim(),
      annualQuota: Number(form.annualQuota),
      carryForward: form.carryForward,
    };
    if (superAdmin) payload.companyId = form.companyId;

    try {
      setSaving(true);
      if (isEdit) await updateLeaveType(leaveType._id, payload);
      else await createLeaveType(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save leave type",
      );
    } finally {
      setSaving(false);
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
        style={{ width: 440, maxWidth: "95vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="calendar" size={16} />{" "}
            {isEdit ? "Edit Leave Type" : "Add Leave Type"}
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
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Name *</label>
            <input
              className="search-box"
              style={inputStyle}
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Sick Leave"
              autoFocus
            />
          </div>

          <Row>
            <Field label="Annual Quota (days) *">
              <input
                type="number"
                min="0"
                className="search-box"
                style={inputStyle}
                value={form.annualQuota}
                onChange={set("annualQuota")}
              />
            </Field>
            <Field label="Carry Forward">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  height: 38,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.carryForward}
                  onChange={set("carryForward")}
                />
                <span style={{ fontSize: 13.5 }}>
                  Allow unused days to carry over
                </span>
              </label>
            </Field>
          </Row>

          {superAdmin && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Company *</label>
              <select
                className="search-box"
                style={inputStyle}
                value={form.companyId}
                onChange={set("companyId")}
                disabled={isEdit}
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
                  ? "Save Changes"
                  : "Create Leave Type"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
