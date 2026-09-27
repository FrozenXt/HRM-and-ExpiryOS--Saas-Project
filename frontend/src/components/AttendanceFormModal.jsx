import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Row, Field, inputStyle } from "./FormParts";
import {
  createAttendance,
  updateAttendance,
} from "../services/attendanceService";
import { listOptions } from "../services/employeeService";

const STATUSES = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "half_day", label: "Half day" },
  { value: "absent", label: "Absent" },
];

const idOf = (v) => v?._id || v || "";
const pad = (n) => String(n).padStart(2, "0");
const toDateInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
const toTimeInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return `${pad(x.getHours())}:${pad(x.getMinutes())}`;
};
// Local date + "HH:MM" -> ISO string (null when the time is empty)
const combine = (date, time) =>
  date && time ? new Date(`${date}T${time}`).toISOString() : null;

const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");

export default function AttendanceFormModal({
  mode = "create",
  record,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit" && !!record;

  const [form, setForm] = useState({
    employeeId: isEdit ? idOf(record.employeeId) : "",
    date: isEdit ? toDateInput(record.date) : toDateInput(new Date()),
    checkIn: isEdit ? toTimeInput(record.checkIn) : "",
    checkOut: isEdit ? toTimeInput(record.checkOut) : "",
    status: isEdit ? record.status : "present",
  });
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listOptions("employees"), listOptions("users")])
      .then(([emps, usrs]) => {
        setEmployees(emps);
        setUsers(Object.fromEntries(usrs.map((u) => [u._id, u])));
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.employeeId || !form.date) {
      setError("Employee and date are required.");
      return;
    }
    if (form.checkOut && !form.checkIn) {
      setError("Add a check-in time before a check-out time.");
      return;
    }
    const inISO = combine(form.date, form.checkIn);
    const outISO = combine(form.date, form.checkOut);
    if (inISO && outISO && new Date(outISO) <= new Date(inISO)) {
      setError("Check-out must be after check-in.");
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit) {
        await updateAttendance(record._id, {
          checkIn: inISO,
          checkOut: outISO,
          status: form.status,
        });
      } else {
        await createAttendance({
          employeeId: form.employeeId,
          // local midnight, same convention the self check-in uses
          date: new Date(`${form.date}T00:00:00`).toISOString(),
          checkIn: inISO,
          checkOut: outISO,
          status: form.status,
        });
      }
      onSaved();
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
          width: 500,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="clock" size={16} />{" "}
            {isEdit ? "Edit Attendance" : "Add Attendance"}
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
          <Row>
            <Field label="Employee *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.employeeId}
                onChange={set("employeeId")}
                disabled={isEdit}
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {fullName(users[idOf(emp.userId)]) ||
                      `Employee #${emp.id_int ?? ""}`}
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
                disabled={isEdit}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Check-in time">
              <input
                type="time"
                className="search-box"
                style={inputStyle}
                value={form.checkIn}
                onChange={set("checkIn")}
              />
            </Field>
            <Field label="Check-out time">
              <input
                type="time"
                className="search-box"
                style={inputStyle}
                value={form.checkOut}
                onChange={set("checkOut")}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Status">
              <select
                className="search-box"
                style={inputStyle}
                value={form.status}
                onChange={set("status")}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </Row>

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
                  : "Add Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
