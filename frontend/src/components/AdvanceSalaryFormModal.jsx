// src/components/AdvanceSalaryFormModal.jsx
// Staff request an advance for themselves (no employee picker, the server
// uses the logged-in user's token).
import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { Section, Row, Field, inputStyle } from "./FormParts";
import { createAdvanceSalary } from "../services/advanceSalaryService";

const emptyForm = { amount: "", installments: "1", reason: "" };

export default function AdvanceSalaryFormModal({ onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const perInstallment = useMemo(() => {
    const a = Number(form.amount);
    const n = Number(form.installments);
    return a > 0 && n > 0 ? Math.round(a / n) : 0;
  }, [form.amount, form.installments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!(Number(form.amount) > 0)) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!form.reason.trim()) {
      setError("Please give a reason.");
      return;
    }

    const payload = {
      amount: Number(form.amount),
      installments: Number(form.installments),
      reason: form.reason.trim(),
    };

    try {
      setSubmitting(true);
      const result = await createAdvanceSalary(payload);
      onSaved(result.data.data);
      onClose();
    } catch (err) {
      // The server names the rule that was broken (50% cap, open advance, no salary structure...)
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
            <Icon name="dollar" size={16} /> Request Advance Salary
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
          <Section title="Request" first />
          <Row>
            <Field label="Amount *">
              <input
                type="number"
                min="1"
                className="search-box"
                style={inputStyle}
                value={form.amount}
                onChange={set("amount")}
                placeholder="e.g. 25000"
              />
            </Field>
            <Field label="Repay in *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.installments}
                onChange={set("installments")}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "installment" : "installments"}
                  </option>
                ))}
              </select>
            </Field>
          </Row>

          {perInstallment > 0 && (
            <p
              className="muted"
              style={{ fontSize: 12.5, margin: "-6px 0 14px" }}
            >
              About {perInstallment.toLocaleString()} will be deducted from each
              salary.
            </p>
          )}

          <div style={{ marginBottom: 14 }}>
            <Field label="Reason *">
              <textarea
                className="search-box"
                style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                value={form.reason}
                onChange={set("reason")}
                placeholder="e.g. Medical expenses"
              />
            </Field>
          </div>

          <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
            Up to 50% of your basic salary, 1 to 12 installments, and one open
            advance at a time.
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
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
