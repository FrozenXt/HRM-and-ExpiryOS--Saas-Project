import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { Row, Field, inputStyle, labelStyle } from "./FormParts";
import { isSuperAdmin, myCompanyId } from "../utils/auth";
import { listOptions } from "../services/employeeService";
import {
  createLeaveBalance,
  updateLeaveBalance,
} from "../services/leaveBalanceService";

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const currentYear = new Date().getFullYear();

const readOnlyInputStyle = { ...inputStyle, background: "var(--surface-2)" };

export default function LeaveBalanceModal({
  mode = "create",
  balance,
  employeeName, // resolved by the list page, for display while adjusting
  leaveTypeName,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit" && !!balance;
  const superAdmin = isSuperAdmin();

  const [form, setForm] = useState(() =>
    isEdit
      ? {
          companyId: "",
          employeeId: idOf(balance.employeeId),
          leaveTypeId: idOf(balance.leaveTypeId),
          year: balance.year ?? currentYear,
          used: balance.used ?? 0,
          remaining: balance.remaining ?? 0,
        }
      : {
          companyId: superAdmin ? "" : myCompanyId(),
          employeeId: "",
          leaveTypeId: "",
          year: currentYear,
          used: 0,
          remaining: "",
        },
  );

  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState({});
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [autoRemaining, setAutoRemaining] = useState(!isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Create mode only — need employees + leave types scoped to a company.
  const ready = superAdmin ? !!form.companyId : true;
  const scopeId = superAdmin ? form.companyId : undefined;

  useEffect(() => {
    if (isEdit || !superAdmin) return;
    listOptions("companies")
      .then(setCompanies)
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [isEdit, superAdmin]);

  useEffect(() => {
    if (isEdit || !ready) {
      setEmployees([]);
      setUsers({});
      setLeaveTypes([]);
      return;
    }
    let cancelled = false;
    setLoadingOptions(true);
    Promise.all([
      listOptions("employees", scopeId),
      listOptions("users", scopeId),
      listOptions("leave-types", scopeId),
    ])
      .then(([emps, usrs, types]) => {
        if (cancelled) return;
        setEmployees(emps || []);
        setUsers(Object.fromEntries((usrs || []).map((u) => [u._id, u])));
        setLeaveTypes(types || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      })
      .finally(() => !cancelled && setLoadingOptions(false));
    return () => {
      cancelled = true;
    };
  }, [isEdit, ready, form.companyId]);

  const selectedLeaveType = useMemo(
    () => leaveTypes.find((lt) => lt._id === form.leaveTypeId),
    [leaveTypes, form.leaveTypeId],
  );

  // Remaining auto-fills from (leave type's annual quota − used) until the
  // admin types over it directly.
  useEffect(() => {
    if (!autoRemaining || isEdit) return;
    const quota = Number(selectedLeaveType?.annualQuota) || 0;
    const used = Number(form.used) || 0;
    setForm((f) => ({ ...f, remaining: Math.max(0, quota - used) }));
  }, [autoRemaining, isEdit, selectedLeaveType, form.used]);

  const onCompanyChange = (e) =>
    setForm((f) => ({
      ...f,
      companyId: e.target.value,
      employeeId: "",
      leaveTypeId: "",
    }));

  const onRemainingChange = (e) => {
    setAutoRemaining(false);
    setForm((f) => ({ ...f, remaining: e.target.value }));
  };

  const total = (Number(form.used) || 0) + (Number(form.remaining) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isEdit) {
      if (superAdmin && !form.companyId)
        return setError("Please select a company.");
      if (!form.employeeId) return setError("Please select an employee.");
      if (!form.leaveTypeId) return setError("Please select a leave type.");
      if (!form.year) return setError("Please enter a year.");
    }
    if (form.used === "" || Number(form.used) < 0)
      return setError("Enter a valid used amount.");
    if (form.remaining === "" || Number(form.remaining) < 0)
      return setError("Enter a valid remaining amount.");

    const payload = isEdit
      ? {
          used: Number(form.used),
          remaining: Number(form.remaining),
        }
      : {
          employeeId: form.employeeId,
          leaveTypeId: form.leaveTypeId,
          year: Number(form.year),
          used: Number(form.used),
          remaining: Number(form.remaining),
        };
    if (!isEdit && superAdmin) payload.companyId = form.companyId;

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updateLeaveBalance(balance._id, payload)
        : await createLeaveBalance(payload);
      onSaved(result.data.data);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save leave balance",
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
            <Icon name="calendar" size={16} />{" "}
            {isEdit ? "Adjust Leave Balance" : "Add Leave Balance"}
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
          {isEdit ? (
            <Row>
              <Field label="Employee">
                <input
                  className="search-box"
                  style={readOnlyInputStyle}
                  value={employeeName || "-"}
                  readOnly
                />
              </Field>
              <Field label="Leave Type">
                <input
                  className="search-box"
                  style={readOnlyInputStyle}
                  value={leaveTypeName || "-"}
                  readOnly
                />
              </Field>
            </Row>
          ) : (
            <>
              {superAdmin && (
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Company *</label>
                  <select
                    className="search-box"
                    style={inputStyle}
                    value={form.companyId}
                    onChange={onCompanyChange}
                  >
                    <option value="">Select company</option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.legalName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Employee *</label>
                <select
                  className="search-box"
                  style={inputStyle}
                  value={form.employeeId}
                  onChange={set("employeeId")}
                  disabled={!ready || loadingOptions}
                >
                  <option value="">
                    {!ready
                      ? "Select company first"
                      : loadingOptions
                        ? "Loading..."
                        : "Select employee"}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {fullName(users[idOf(emp.userId)]) ||
                        `Employee #${emp.id_int ?? ""}`}
                    </option>
                  ))}
                </select>
              </div>
              <Row>
                <Field label="Leave Type *">
                  <select
                    className="search-box"
                    style={inputStyle}
                    value={form.leaveTypeId}
                    onChange={set("leaveTypeId")}
                    disabled={!ready || loadingOptions}
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map((lt) => (
                      <option key={lt._id} value={lt._id}>
                        {lt.name} ({lt.annualQuota} days)
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Year *">
                  <input
                    type="number"
                    className="search-box"
                    style={inputStyle}
                    value={form.year}
                    onChange={set("year")}
                  />
                </Field>
              </Row>
            </>
          )}

          <Row>
            <Field label="Used (days) *">
              <input
                type="number"
                min="0"
                className="search-box"
                style={inputStyle}
                value={form.used}
                onChange={set("used")}
              />
            </Field>
            <Field label="Remaining (days) *">
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number"
                  min="0"
                  className="search-box"
                  style={inputStyle}
                  value={form.remaining}
                  onChange={onRemainingChange}
                />
                {!autoRemaining && !isEdit && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setAutoRemaining(true)}
                  >
                    Auto
                  </button>
                )}
              </div>
            </Field>
          </Row>
          {!isEdit && (
            <p
              className="muted"
              style={{ fontSize: 12, marginTop: -6, marginBottom: 14 }}
            >
              Remaining auto-fills from the leave type's annual quota minus Used
              — edit it directly to override.
            </p>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Total (Used + Remaining)</label>
            <input
              className="search-box"
              style={readOnlyInputStyle}
              value={total}
              readOnly
            />
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
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
            }}
          >
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn primary">
              {submitting
                ? "Saving..."
                : isEdit
                  ? "Save Adjustment"
                  : "Create Balance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
