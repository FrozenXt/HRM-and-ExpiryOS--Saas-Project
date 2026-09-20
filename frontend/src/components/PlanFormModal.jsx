import { useState } from "react";
import { Icon } from "./Icon";
import { createPlan } from "../services/planService";

const ALL_FEATURES = [
  { key: "payroll", label: "Payroll" },
  { key: "attendance", label: "Attendance" },
  { key: "expense_claims", label: "Expense Claims" },
];

export default function PlanFormModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [employeeLimit, setEmployeeLimit] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [features, setFeatures] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggleFeature = (key) => {
    setFeatures((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !employeeLimit || !monthlyPrice) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await createPlan({
        name: name.trim(),
        employeeLimit: Number(employeeLimit),
        monthlyPrice: Number(monthlyPrice),
        features,
        isActive,
      });
      onCreated(result.data.data);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to create plan",
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
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{
          width: 440,
          maxWidth: "90vw",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="plusCircle" size={16} /> Add Plan
          </h2>
          <button className="more-btn" onClick={onClose}>
            <Icon
              name="chevronRight"
              size={16}
              style={{ transform: "rotate(45deg)" }}
            />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label
              className="legend-name"
              style={{ display: "block", marginBottom: 6 }}
            >
              Plan Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Growth"
              className="search-box"
              style={{ width: "100%", padding: "9px 12px" }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label
                className="legend-name"
                style={{ display: "block", marginBottom: 6 }}
              >
                Employee Limit
              </label>
              <input
                type="number"
                min="1"
                value={employeeLimit}
                onChange={(e) => setEmployeeLimit(e.target.value)}
                placeholder="e.g. 50"
                className="search-box"
                style={{ width: "100%", padding: "9px 12px" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                className="legend-name"
                style={{ display: "block", marginBottom: 6 }}
              >
                Monthly Price ($)
              </label>
              <input
                type="number"
                min="0"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
                placeholder="e.g. 500"
                className="search-box"
                style={{ width: "100%", padding: "9px 12px" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label
              className="legend-name"
              style={{ display: "block", marginBottom: 8 }}
            >
              Features
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ALL_FEATURES.map((f) => (
                <button
                  type="button"
                  key={f.key}
                  onClick={() => toggleFeature(f.key)}
                  className={`badge ${features.includes(f.key) ? "success" : "warning"}`}
                  style={{ cursor: "pointer", border: "none" }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active immediately
            </label>
          </div>

          {error && (
            <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              className="quick-btn gray"
              style={{
                width: "auto",
                flexDirection: "row",
                padding: "9px 16px",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="quick-btn blue"
              style={{
                width: "auto",
                flexDirection: "row",
                padding: "9px 16px",
              }}
            >
              {submitting ? "Creating..." : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
