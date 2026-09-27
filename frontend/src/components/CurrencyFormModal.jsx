import { useState } from "react";
import { Icon } from "./Icon";
import { createCurrency, updateCurrency } from "../services/currencyService";

const emptyForm = {
  code: "",
  symbol: "",
  name: "",
  decimalPlaces: 2,
  isActive: true,
};

/* ---------- small layout helpers (defined outside so inputs keep focus) ---------- */
const inputStyle = { width: "100%", padding: "9px 12px" };
const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 12.5,
  color: "var(--text-dim)",
};

const Row = ({ children }) => (
  <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>{children}</div>
);

const Field = ({ label, children }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

export default function CurrencyFormModal({
  mode = "create",
  currency,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState(() => {
    if (!isEdit || !currency) return emptyForm;
    return {
      code: currency.code || "",
      symbol: currency.symbol || "",
      name: currency.name || "",
      decimalPlaces:
        currency.decimalPlaces === 0 || currency.decimalPlaces
          ? currency.decimalPlaces
          : 2,
      isActive: currency.isActive ?? true,
    };
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.code.trim() || !form.name.trim() || !form.symbol.trim()) {
      setError("Code, name and symbol are required.");
      return;
    }

    const decimalPlaces = Number(form.decimalPlaces);
    if (Number.isNaN(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 6) {
      setError("Decimal places must be a number between 0 and 6.");
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      symbol: form.symbol.trim(),
      name: form.name.trim(),
      decimalPlaces,
      isActive: form.isActive === true || form.isActive === "true",
    };

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updateCurrency(currency._id, payload)
        : await createCurrency(payload);
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
          width: 460,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="dollar" size={16} />{" "}
            {isEdit ? "Edit Currency" : "Add Currency"}
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
            <Field label="Code * (e.g. NPR)">
              <input
                className="search-box"
                style={{ ...inputStyle, textTransform: "uppercase" }}
                value={form.code}
                onChange={set("code")}
                maxLength={6}
              />
            </Field>
            <Field label="Symbol * (e.g. ₹)">
              <input
                className="search-box"
                style={inputStyle}
                value={form.symbol}
                onChange={set("symbol")}
                maxLength={4}
              />
            </Field>
          </Row>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Name * (e.g. Nepali Rupee)</label>
            <input
              className="search-box"
              style={inputStyle}
              value={form.name}
              onChange={set("name")}
            />
          </div>

          <Row>
            <Field label="Decimal Places">
              <input
                type="number"
                min="0"
                max="6"
                className="search-box"
                style={inputStyle}
                value={form.decimalPlaces}
                onChange={set("decimalPlaces")}
              />
            </Field>
            <Field label="Status">
              <select
                className="search-box"
                style={inputStyle}
                value={String(form.isActive)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    isActive: e.target.value === "true",
                  }))
                }
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
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
                  : "Create Currency"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
