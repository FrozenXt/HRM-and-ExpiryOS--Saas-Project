import { useState } from "react";
import { Icon } from "./Icon";
import { createPlan, updatePlan } from "../services/planService";

const ALL_FEATURES = [
  { key: "payroll", label: "Payroll" },
  { key: "attendance", label: "Attendance" },
  { key: "expense_claims", label: "Expense Claims" },
];

export default function PlanFormModal({
  mode = "create",
  plan,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";

  const [name, setName] = useState(plan?.name || "");
  const [monthlyPricePerEmployee, setMonthlyPricePerEmployee] = useState(
    plan?.monthlyPricePerEmployee ?? "",
  );
  const [yearlyPricePerEmployee, setYearlyPricePerEmployee] = useState(
    plan?.yearlyPricePerEmployee ?? "",
  );
  const [maxEmployees, setMaxEmployees] = useState(plan?.maxEmployees ?? "");
  const [isCustomPricing, setIsCustomPricing] = useState(
    plan?.isCustomPricing ?? false,
  );
  const [features, setFeatures] = useState(plan?.features || []);
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
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

    if (!name.trim()) {
      setError("Plan name is required.");
      return;
    }
    if (
      !isCustomPricing &&
      (!monthlyPricePerEmployee || !yearlyPricePerEmployee)
    ) {
      setError(
        "Monthly and yearly price per employee are required unless this is a custom-pricing plan.",
      );
      return;
    }

    const payload = {
      name: name.trim(),
      monthlyPricePerEmployee: Number(monthlyPricePerEmployee) || 0,
      yearlyPricePerEmployee: Number(yearlyPricePerEmployee) || 0,
      maxEmployees: maxEmployees === "" ? null : Number(maxEmployees),
      isCustomPricing,
      features,
      isActive,
    };

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updatePlan(plan._id, payload)
        : await createPlan(payload);
      onSaved(result.data.data);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          `Failed to ${isEdit ? "update" : "create"} plan`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle = { display: "block", marginBottom: 6 };
  const inputStyle = { width: "100%", padding: "9px 12px" };

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
            <Icon name="plusCircle" size={16} />{" "}
            {isEdit ? "Edit Plan" : "Add Plan"}
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
            <label className="legend-name" style={labelStyle}>
              Plan Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Business"
              className="search-box"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
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
                checked={isCustomPricing}
                onChange={(e) => setIsCustomPricing(e.target.checked)}
              />
              Custom pricing (Enterprise-style — price set manually per company)
            </label>
          </div>

          {!isCustomPricing && (
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label className="legend-name" style={labelStyle}>
                  Monthly Price / Employee (NPR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={monthlyPricePerEmployee}
                  onChange={(e) => setMonthlyPricePerEmployee(e.target.value)}
                  placeholder="e.g. 50"
                  className="search-box"
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="legend-name" style={labelStyle}>
                  Yearly Price / Employee (NPR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={yearlyPricePerEmployee}
                  onChange={(e) => setYearlyPricePerEmployee(e.target.value)}
                  placeholder="e.g. 500"
                  className="search-box"
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="legend-name" style={labelStyle}>
              Max Employees
            </label>
            <input
              type="number"
              min="0"
              value={maxEmployees}
              onChange={(e) => setMaxEmployees(e.target.value)}
              placeholder="Leave blank for unlimited"
              className="search-box"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label
              className="legend-name"
              style={{ ...labelStyle, marginBottom: 8 }}
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
              Active
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
              {submitting
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
