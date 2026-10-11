// src/components/SupportTicketFormModal.jsx
// Raise a ticket. Dropdown values come from the page's single options call.
import { useState } from "react";
import { Icon } from "./Icon";
import { Section, Row, Field, inputStyle } from "./FormParts";
import { createSupportTicket } from "../services/supportTicketService";
import {
  label,
  checkFiles,
  MAX_FILES,
  MAX_FILE_MB,
} from "../utils/supportTicketUtils";

export default function SupportTicketFormModal({ options, onClose, onSaved }) {
  const [form, setForm] = useState({
    subject: "",
    description: "",
    category: "",
    priority: "medium",
  });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onPickFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // allow picking the same file again
    const next = [...files, ...picked];
    const problem = checkFiles(next);
    if (problem) return setError(problem);
    setError("");
    setFiles(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.subject.trim() || !form.description.trim()) {
      setError("Please fill in the subject and description.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await createSupportTicket(
        {
          subject: form.subject.trim(),
          description: form.description.trim(),
          category: form.category,
          priority: form.priority,
        },
        files,
      );
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

  const goesTo =
    options?.createTarget === "company"
      ? "Your company's admin and HR will see this ticket."
      : "This ticket goes to platform support.";

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
            <Icon name="headphones" size={16} /> Raise a Support Ticket
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
          <Section title="Ticket" first />
          <div style={{ marginBottom: 14 }}>
            <Field label="Subject *">
              <input
                className="search-box"
                style={inputStyle}
                value={form.subject}
                onChange={set("subject")}
                maxLength={200}
              />
            </Field>
          </div>
          <Row>
            <Field label="Category">
              <select
                className="search-box"
                style={inputStyle}
                value={form.category}
                onChange={set("category")}
              >
                <option value="">Other</option>
                {(options?.categories || [])
                  .filter((c) => c !== "other")
                  .map((c) => (
                    <option key={c} value={c}>
                      {label(c)}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                className="search-box"
                style={inputStyle}
                value={form.priority}
                onChange={set("priority")}
              >
                {(options?.priorities || []).map((p) => (
                  <option key={p} value={p}>
                    {label(p)}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <div style={{ marginBottom: 14 }}>
            <Field label="Description *">
              <textarea
                className="search-box"
                style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
                value={form.description}
                onChange={set("description")}
                placeholder="Tell us what happened and what you expected."
              />
            </Field>
          </div>

          <Section title="Attachments" />
          <div style={{ marginBottom: 8 }}>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={onPickFiles}
              disabled={files.length >= MAX_FILES}
            />
          </div>
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
                padding: "4px 0",
              }}
            >
              <span>
                {f.name}{" "}
                <span className="muted">
                  ({(f.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setFiles(files.filter((_, n) => n !== i))}
              >
                Remove
              </button>
            </div>
          ))}
          <p className="muted" style={{ fontSize: 12, margin: "6px 0 14px" }}>
            Up to {MAX_FILES} files, {MAX_FILE_MB} MB each (images, PDF, Word,
            Excel, CSV, text). {goesTo}
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
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
