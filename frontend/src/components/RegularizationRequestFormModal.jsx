import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Row, Field, inputStyle, labelStyle } from "./FormParts";
import { getAttendance } from "../services/attendanceService";
import { createRegularizationRequest } from "../services/regularizationService";

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";
const formatTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

// datetime-local inputs need "YYYY-MM-DDTHH:mm" with no timezone offset.
const toLocalInput = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

export default function RegularizationRequestFormModal({ onClose, onSaved }) {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  const [form, setForm] = useState({
    attendanceId: "",
    reason: "",
    requestedCheckIn: "",
    requestedCheckOut: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Staff's own attendance is already scoped server-side — no employeeId
  // filter needed here. Most recent 30 records, enough to cover a missed
  // punch from the last month.
  useEffect(() => {
    getAttendance({ limit: 30, sort: "DESC", sort_field: "date" })
      .then((res) => setAttendanceRecords(res.data.data.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoadingRecords(false));
  }, []);

  const selectedRecord = attendanceRecords.find(
    (a) => a._id === form.attendanceId,
  );

  const onAttendanceChange = (e) => {
    const attendanceId = e.target.value;
    const record = attendanceRecords.find((a) => a._id === attendanceId);
    setForm((f) => ({
      ...f,
      attendanceId,
      // Pre-fill with the existing times as a starting point to correct.
      requestedCheckIn: record?.checkIn
        ? toLocalInput(record.checkIn)
        : f.requestedCheckIn,
      requestedCheckOut: record?.checkOut
        ? toLocalInput(record.checkOut)
        : f.requestedCheckOut,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.attendanceId)
      return setError("Please select an attendance record.");
    if (!form.reason.trim())
      return setError("Please explain why this needs correcting.");
    if (!form.requestedCheckIn && !form.requestedCheckOut)
      return setError("Enter at least a requested check-in or check-out time.");
    if (
      form.requestedCheckIn &&
      form.requestedCheckOut &&
      new Date(form.requestedCheckIn) > new Date(form.requestedCheckOut)
    )
      return setError(
        "Requested check-in cannot be after requested check-out.",
      );

    const payload = {
      attendanceId: form.attendanceId,
      reason: form.reason.trim(),
    };
    if (form.requestedCheckIn)
      payload.requestedCheckIn = new Date(form.requestedCheckIn).toISOString();
    if (form.requestedCheckOut)
      payload.requestedCheckOut = new Date(
        form.requestedCheckOut,
      ).toISOString();

    try {
      setSubmitting(true);
      const result = await createRegularizationRequest(payload);
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
          width: 540,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="edit" size={16} /> Request Attendance Correction
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
            <label style={labelStyle}>Attendance Record *</label>
            <select
              className="search-box"
              style={inputStyle}
              value={form.attendanceId}
              onChange={onAttendanceChange}
              disabled={loadingRecords}
            >
              <option value="">
                {loadingRecords
                  ? "Loading your attendance..."
                  : "Select the day to correct"}
              </option>
              {attendanceRecords.map((a) => (
                <option key={a._id} value={a._id}>
                  {formatDate(a.date)} — In: {formatTime(a.checkIn)}, Out:{" "}
                  {formatTime(a.checkOut)}
                  {a.status ? ` (${a.status})` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedRecord && (
            <p
              className="muted"
              style={{ fontSize: 12.5, marginTop: -6, marginBottom: 14 }}
            >
              Currently recorded: check-in {formatTime(selectedRecord.checkIn)},
              check-out {formatTime(selectedRecord.checkOut)} on{" "}
              {formatDate(selectedRecord.date)}.
            </p>
          )}

          <Row>
            <Field label="Requested Check-In">
              <input
                type="datetime-local"
                className="search-box"
                style={inputStyle}
                value={form.requestedCheckIn}
                onChange={set("requestedCheckIn")}
              />
            </Field>
            <Field label="Requested Check-Out">
              <input
                type="datetime-local"
                className="search-box"
                style={inputStyle}
                value={form.requestedCheckOut}
                onChange={set("requestedCheckOut")}
              />
            </Field>
          </Row>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Reason *</label>
            <textarea
              className="search-box"
              style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              value={form.reason}
              onChange={set("reason")}
              placeholder="e.g. Forgot to check out, left at 6pm"
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
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
