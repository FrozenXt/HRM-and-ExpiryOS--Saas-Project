// src/components/ShiftFormModal.jsx
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Row, Field, inputStyle } from "./FormParts";
import { isSuperAdmin } from "../utils/auth";
import { listOptions } from "../services/employeeService";
import { createShift, updateShift } from "../services/shiftService";
import { isOvernight, lengthMinutes, hm } from "../utils/shiftFormat";

const idOf = (v) => v?._id || v || "";

const emptyForm = {
  companyId: "",
  name: "",
  startTime: "09:00",
  endTime: "18:00",
  breakMinutes: "60",
  graceMinutes: "", // blank = use the company's late grace
  color: "#3b82f6",
  isActive: "true",
};

export default function ShiftFormModal({
  mode = "create",
  shift,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";
  const superAdmin = isSuperAdmin();

  const [form, setForm] = useState(() => {
    if (!isEdit || !shift) return emptyForm;
    return {
      companyId: idOf(shift.companyId),
      name: shift.name || "",
      startTime: shift.startTime || "09:00",
      endTime: shift.endTime || "18:00",
      breakMinutes: String(shift.breakMinutes ?? 0),
      graceMinutes:
        shift.graceMinutes === null || shift.graceMinutes === undefined
          ? ""
          : String(shift.graceMinutes),
      color: shift.color || "#3b82f6",
      isActive: shift.isActive === false ? "false" : "true",
    };
  });

  const [companies, setCompanies] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Only a super admin picks the company; company admins are scoped by the server.
  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then(setCompanies)
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [superAdmin]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const total = lengthMinutes(form.startTime, form.endTime);
  const breakMin = Number(form.breakMinutes) || 0;
  const overnight = isOvernight(form.startTime, form.endTime);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.startTime || !form.endTime) {
      setError("Name, start time and end time are required.");
      return;
    }
    if (superAdmin && !isEdit && !form.companyId) {
      setError("Select a company.");
      return;
    }
    if (form.startTime === form.endTime) {
      setError("Start and end time cannot be the same.");
      return;
    }
    if (breakMin >= total) {
      setError("Break must be shorter than the shift.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
      breakMinutes: breakMin,
      graceMinutes: form.graceMinutes === "" ? null : Number(form.graceMinutes),
      color: form.color,
      isActive: form.isActive === "true",
    };
    if (superAdmin && !isEdit) payload.companyId = form.companyId;

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updateShift(shift._id, payload)
        : await createShift(payload);
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
            <Icon name="clock" size={16} />{" "}
            {isEdit ? "Edit Shift" : "Add Shift"}
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
          {superAdmin && (
            <Row>
              <Field label="Company *">
                <select
                  className="search-box"
                  style={inputStyle}
                  value={form.companyId}
                  onChange={set("companyId")}
                  disabled={isEdit}
                >
                  <option value="">Select company</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.legalName}
                    </option>
                  ))}
                </select>
              </Field>
            </Row>
          )}

          <Row>
            <Field label="Shift Name *">
              <input
                className="search-box"
                style={inputStyle}
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. Morning, Evening, Night"
              />
            </Field>
            <Field label="Color">
              <input
                type="color"
                value={form.color}
                onChange={set("color")}
                style={{ width: "100%", height: 38, padding: 2 }}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Start Time *">
              <input
                type="time"
                className="search-box"
                style={inputStyle}
                value={form.startTime}
                onChange={set("startTime")}
              />
            </Field>
            <Field label="End Time *">
              <input
                type="time"
                className="search-box"
                style={inputStyle}
                value={form.endTime}
                onChange={set("endTime")}
              />
            </Field>
          </Row>

          <p
            className="muted"
            style={{ fontSize: 12.5, margin: "-6px 0 14px" }}
          >
            {hm(total)} long
            {breakMin > 0 && total > breakMin
              ? `, ${hm(total - breakMin)} after the break`
              : ""}
            .
            {overnight &&
              " Overnight shift: it ends the next day, and check-out after midnight is handled correctly."}
          </p>

          <Row>
            <Field label="Break (minutes)">
              <input
                type="number"
                min="0"
                className="search-box"
                style={inputStyle}
                value={form.breakMinutes}
                onChange={set("breakMinutes")}
              />
            </Field>
            <Field
              label="Late grace (minutes)"
              hint="Leave blank to use the company setting."
            >
              <input
                type="number"
                min="0"
                className="search-box"
                style={inputStyle}
                value={form.graceMinutes}
                onChange={set("graceMinutes")}
                placeholder="Company default"
              />
            </Field>
          </Row>

          <Row>
            <Field label="Status">
              <select
                className="search-box"
                style={inputStyle}
                value={form.isActive}
                onChange={set("isActive")}
              >
                <option value="true">Active</option>
                <option value="false">
                  Inactive (employees fall back to company hours)
                </option>
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
                  : "Create Shift"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
