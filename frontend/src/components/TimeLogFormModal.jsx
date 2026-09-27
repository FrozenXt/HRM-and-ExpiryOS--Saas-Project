import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Section, Row, Field, inputStyle } from "./FormParts";
import { isSuperAdmin, getCurrentUser } from "../utils/auth";
import { listOptions } from "../services/employeeService";
import { createTimeLog, updateTimeLog } from "../services/timeLogService";

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");

const emptyForm = {
  employeeId: "",
  date: "",
  hoursWorked: "",
  overtimeHours: "0",
  taskDescription: "",
};

export default function TimeLogFormModal({
  mode = "create",
  timeLog,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";
  const me = getCurrentUser();
  const isStaff = me?.role === "staff"; // staff always logs against themselves

  const [form, setForm] = useState(() => {
    if (!isEdit || !timeLog) return { ...emptyForm };
    return {
      employeeId: idOf(timeLog.employeeId),
      date: timeLog.date?.slice(0, 10) || "",
      hoursWorked: timeLog.hoursWorked ?? "",
      overtimeHours: timeLog.overtimeHours ?? "0",
      taskDescription: timeLog.taskDescription || "",
    };
  });

  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Employee dropdown for admin/hr/super admin. Not needed for staff —
  // they always log against their own employeeId, resolved server-side.
  useEffect(() => {
    if (isStaff) return;
    let cancelled = false;
    setLoadingLookups(true);
    Promise.all([listOptions("users"), listOptions("employees")])
      .then(([u, e]) => {
        if (!cancelled) {
          setUsers(u);
          setEmployees(e);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      (!isStaff && !form.employeeId) ||
      !form.date ||
      form.hoursWorked === ""
    ) {
      setError("Please fill in all required fields (marked *).");
      return;
    }
    if (Number(form.hoursWorked) < 0 || Number(form.hoursWorked) > 24) {
      setError("Hours worked must be between 0 and 24.");
      return;
    }

    const payload = {
      date: form.date,
      hoursWorked: Number(form.hoursWorked),
      overtimeHours: Number(form.overtimeHours) || 0,
      taskDescription: form.taskDescription.trim(),
    };
    if (!isStaff) payload.employeeId = form.employeeId; // staff's own id is resolved server-side

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updateTimeLog(timeLog._id, payload)
        : await createTimeLog(payload);
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
            <Icon name="clock" size={16} />{" "}
            {isEdit ? "Edit Draft Time Log" : "Log Time"}
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
          <Section title="Entry" first />
          <Row>
            {!isStaff && (
              <Field label="Employee *">
                <select
                  className="search-box"
                  style={inputStyle}
                  value={form.employeeId}
                  onChange={set("employeeId")}
                  disabled={isEdit}
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
            <Field label="Date *">
              <input
                type="date"
                className="search-box"
                style={inputStyle}
                value={form.date}
                onChange={set("date")}
                disabled={isEdit}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Hours Worked *">
              <input
                type="number"
                min="0"
                max="24"
                step="0.25"
                className="search-box"
                style={inputStyle}
                value={form.hoursWorked}
                onChange={set("hoursWorked")}
              />
            </Field>
            <Field label="Overtime Hours">
              <input
                type="number"
                min="0"
                step="0.25"
                className="search-box"
                style={inputStyle}
                value={form.overtimeHours}
                onChange={set("overtimeHours")}
              />
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
              Task Description
            </label>
            <textarea
              className="search-box"
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              value={form.taskDescription}
              onChange={set("taskDescription")}
              placeholder="What did you work on?"
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
                  : "Save Draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
