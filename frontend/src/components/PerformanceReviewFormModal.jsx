import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import {
  createPerformanceReview,
  updatePerformanceReview,
} from "../services/performanceReviewService";
import { listOptions } from "../services/employeeService";
import { employeeName } from "../utils/performanceReviewUtils";

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");

const emptyForm = {
  employeeId: "",
  reviewPeriod: "",
  rating: 3,
  strengths: "",
  areasOfImprovement: "",
  status: "draft",
};

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

// Builds period options like 2026-H1, 2026-H2, 2026-Q1 ... for this and last year.
const buildPeriods = () => {
  const y = new Date().getFullYear();
  const out = [];
  [y, y - 1].forEach((year) => {
    ["H1", "H2", "Q1", "Q2", "Q3", "Q4"].forEach((p) =>
      out.push(`${year}-${p}`),
    );
  });
  return out;
};

export default function PerformanceReviewFormModal({
  mode = "create",
  review,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState(() => {
    if (!isEdit || !review) return emptyForm;
    return {
      employeeId: review.employeeId?._id || "",
      reviewPeriod: review.reviewPeriod || "",
      rating: review.rating ?? 3,
      strengths: review.strengths || "",
      areasOfImprovement: review.areasOfImprovement || "",
      status: review.status || "draft",
    };
  });

  const [employees, setEmployees] = useState([]);
  const [loadingEmp, setLoadingEmp] = useState(!isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Same approach as the Salary form: load employees and users, then match
  // each employee's userId to a user to get the name.
  const [usersById, setUsersById] = useState({});

  useEffect(() => {
    if (isEdit) return; // employee/period can't change on edit
    let cancelled = false;
    Promise.all([listOptions("employees"), listOptions("users")])
      .then(([emps, users]) => {
        if (cancelled) return;
        setEmployees(emps);
        setUsersById(Object.fromEntries(users.map((u) => [u._id, u])));
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err.response?.data?.message || "Could not load employees list",
          );
      })
      .finally(() => !cancelled && setLoadingEmp(false));
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  const optionLabel = (emp) =>
    fullName(usersById[idOf(emp.userId)]) || `Employee #${emp.id_int ?? ""}`;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.employeeId || !form.reviewPeriod) {
      setError("Employee and review period are required.");
      return;
    }
    const rating = Number(form.rating);
    if (!(rating >= 1 && rating <= 5)) {
      setError("Rating must be between 1 and 5.");
      return;
    }

    const payload = {
      rating,
      strengths: form.strengths,
      areasOfImprovement: form.areasOfImprovement,
      status: form.status,
    };

    try {
      setSubmitting(true);
      let result;
      if (isEdit) {
        result = await updatePerformanceReview(review._id, payload);
      } else {
        // companyId & reviewerId default on the server (token's company / caller)
        result = await createPerformanceReview({
          ...payload,
          employeeId: form.employeeId,
          reviewPeriod: form.reviewPeriod,
        });
      }
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
          width: 560,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="clock" size={16} />{" "}
            {isEdit ? "Edit Performance Review" : "New Performance Review"}
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
              {isEdit ? (
                <input
                  className="search-box"
                  style={inputStyle}
                  value={employeeName(review?.employeeId)}
                  disabled
                />
              ) : (
                <select
                  className="search-box"
                  style={inputStyle}
                  value={form.employeeId}
                  onChange={set("employeeId")}
                >
                  <option value="">
                    {loadingEmp ? "Loading..." : "Select employee"}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {optionLabel(emp)}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Review Period *">
              {isEdit ? (
                <input
                  className="search-box"
                  style={inputStyle}
                  value={form.reviewPeriod}
                  disabled
                />
              ) : (
                <select
                  className="search-box"
                  style={inputStyle}
                  value={form.reviewPeriod}
                  onChange={set("reviewPeriod")}
                >
                  <option value="">Select period</option>
                  {buildPeriods().map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </Row>

          <Row>
            <Field label={`Rating * (${form.rating} / 5)`}>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={form.rating}
                onChange={set("rating")}
                style={{ width: "100%" }}
              />
            </Field>
            <Field label="Status">
              <select
                className="search-box"
                style={inputStyle}
                value={form.status}
                onChange={set("status")}
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
              </select>
            </Field>
          </Row>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Strengths</label>
            <textarea
              className="search-box"
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              value={form.strengths}
              onChange={set("strengths")}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Areas of Improvement</label>
            <textarea
              className="search-box"
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              value={form.areasOfImprovement}
              onChange={set("areasOfImprovement")}
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
              {submitting
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
