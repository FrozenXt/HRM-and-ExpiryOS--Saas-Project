// src/components/EventFormModal.jsx
import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { Section, Row, Field, inputStyle } from "./FormParts";
import { createEvent, updateEvent } from "../services/eventService";
import { listOptions } from "../services/employeeService";

/* ---------- constants ---------- */

const TYPE_OPTIONS = [
  { value: "birthday", label: "Birthday" },
  { value: "work_anniversary", label: "Work Anniversary" },
  { value: "company_event", label: "Company Event" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
];

const REQUIRES_EMPLOYEE = ["birthday", "work_anniversary"];

const emptyForm = {
  type: "company_event",
  title: "",
  employeeId: "",
  date: "",
  description: "",
  isRecurringYearly: false,
};

/* ---------- helpers ---------- */

const idOf = (v) => v?._id || v || "";

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const fullName = (u) =>
  u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "";

/**
 * Best-effort display name for an employee record, handling all shapes:
 *   1. userId populated      → use its firstName/lastName
 *   2. userId is a string    → look it up in usersById
 *   3. name on emp itself    → use it
 *   4. nothing usable        → fall back to id_int / _id tail
 */
const employeeName = (emp, usersById = {}) => {
  if (!emp) return "";

  if (emp.userId && typeof emp.userId === "object") {
    const n = fullName(emp.userId);
    if (n) return n;
  }
  if (typeof emp.userId === "string" && usersById[emp.userId]) {
    const n = fullName(usersById[emp.userId]);
    if (n) return n;
  }
  if (emp.firstName || emp.lastName) {
    return `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
  }
  if (emp.id_int != null) return `Employee #${emp.id_int}`;
  return emp._id ? `Employee …${String(emp._id).slice(-6)}` : "Employee";
};

/* ---------- component ---------- */

export default function EventFormModal({
  mode = "create",
  event,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState(() => {
    if (isEdit && event) {
      return {
        type: event.type || "company_event",
        title: event.title || "",
        employeeId: idOf(event.employeeId),
        date: toDateInput(event.date),
        description: event.description || "",
        isRecurringYearly: !!event.isRecurringYearly,
      };
    }
    return { ...emptyForm };
  });

  const [employees, setEmployees] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const requiresEmployee = REQUIRES_EMPLOYEE.includes(form.type);

  /* ---------- fetch employees + users once ---------- */
  useEffect(() => {
    let cancelled = false;
    setLoadingLookups(true);

    Promise.allSettled([listOptions("employees"), listOptions("users")])
      .then(([empsResult, usersResult]) => {
        if (cancelled) return;

        const emps = empsResult.status === "fulfilled" ? empsResult.value : [];
        const users =
          usersResult.status === "fulfilled" ? usersResult.value : [];

        setEmployees(emps);
        setUsersById(Object.fromEntries(users.map((u) => [u._id, u])));

        // Surface the first failure, if any, but don't block the modal
        const firstErr = [empsResult, usersResult].find(
          (r) => r.status === "rejected",
        );
        if (firstErr) {
          setError(
            firstErr.reason?.response?.data?.message ||
              firstErr.reason?.message ||
              "Failed to load lookups.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLookups(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- sorted employees for the dropdown ---------- */
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) =>
      employeeName(a, usersById).localeCompare(employeeName(b, usersById)),
    );
  }, [employees, usersById]);

  /* ---------- submit ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim() || !form.date) {
      setError("Title and date are required.");
      return;
    }
    if (requiresEmployee && !form.employeeId) {
      setError(`Employee is required for "${form.type}".`);
      return;
    }

    const payload = {
      type: form.type,
      title: form.title.trim(),
      date: form.date,
      description: form.description.trim() || null,
      isRecurringYearly: !!form.isRecurringYearly,
      employeeId: form.employeeId || null,
    };

    try {
      setSubmitting(true);
      const res = isEdit
        ? await updateEvent(event._id, payload)
        : await createEvent(payload);
      onSaved?.(res.data.data);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- render ---------- */
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
            <Icon name="calendar" size={16} />{" "}
            {isEdit ? "Edit Event" : "Create Event"}
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
          <Section title="Event" first />

          <Row>
            <Field label="Type *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.type}
                onChange={set("type")}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Date *">
              <input
                type="date"
                className="search-box"
                style={inputStyle}
                value={form.date}
                onChange={set("date")}
              />
            </Field>
          </Row>

          <Field label="Title *">
            <input
              type="text"
              className="search-box"
              style={inputStyle}
              value={form.title}
              onChange={set("title")}
              placeholder="e.g. Amrita's birthday"
            />
          </Field>

          <Field
            label={requiresEmployee ? "Employee *" : "Employee"}
            hint={
              requiresEmployee
                ? undefined
                : "Optional — attach to an employee if relevant."
            }
          >
            <select
              className="search-box"
              style={inputStyle}
              value={form.employeeId}
              onChange={set("employeeId")}
            >
              <option value="">
                {loadingLookups ? "Loading..." : "Select employee"}
              </option>
              {sortedEmployees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {employeeName(emp, usersById)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Description">
            <textarea
              className="search-box"
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              value={form.description}
              onChange={set("description")}
              placeholder="Optional details..."
            />
          </Field>

          <div
            className="toggle-row"
            style={{ marginTop: 8, borderBottom: "none" }}
          >
            <div className="toggle-row-text">
              <div className="toggle-title">Repeat yearly</div>
              <div className="toggle-desc">
                Show this event every year on the same date.
              </div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={form.isRecurringYearly}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    isRecurringYearly: e.target.checked,
                  }))
                }
              />
              <span className="switch-track" />
            </label>
          </div>

          {error && (
            <p
              style={{
                color: "var(--red)",
                fontSize: 13,
                marginTop: 14,
              }}
            >
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 12,
            }}
          >
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn primary">
              {submitting ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
