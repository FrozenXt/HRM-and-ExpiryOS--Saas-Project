// src/components/ResignationFormModal.jsx
// Staff submit their own resignation (no employee picker, the server uses the
// logged-in user's token).
import { useState } from "react";
import { Icon } from "./Icon";
import { Section, Row, Field, inputStyle } from "./FormParts";
import { createResignation } from "../services/resignationService";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function ResignationFormModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ reason: "", proposedLastWorkingDay: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.proposedLastWorkingDay) {
      setError("Please choose your proposed last working day.");
      return;
    }
    if (form.proposedLastWorkingDay < todayStr()) {
      setError("The last working day cannot be in the past.");
      return;
    }
    if (!form.reason.trim()) {
      setError("Please give a reason.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await createResignation({
        reason: form.reason.trim(),
        proposedLastWorkingDay: form.proposedLastWorkingDay,
      });
      onSaved(result.data.data);
      onClose();
    } catch (err) {
      // The server names the rule that was broken (open resignation, inactive employee...)
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
          width: 520,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="fileText" size={16} /> Submit Resignation
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
          <Section title="Resignation" first />
          <Row>
            <Field label="Proposed Last Working Day *">
              <input
                type="date"
                min={todayStr()}
                className="search-box"
                style={inputStyle}
                value={form.proposedLastWorkingDay}
                onChange={set("proposedLastWorkingDay")}
              />
            </Field>
          </Row>

          <div style={{ marginBottom: 14 }}>
            <Field label="Reason *">
              <textarea
                className="search-box"
                style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                value={form.reason}
                onChange={set("reason")}
                placeholder="e.g. Relocating to another city"
              />
            </Field>
          </div>

          <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
            HR will review your request and may confirm a different last working
            day. You can only have one open resignation at a time, and you can
            withdraw it while it is open.
          </p>

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
              {submitting ? "Submitting..." : "Submit Resignation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
