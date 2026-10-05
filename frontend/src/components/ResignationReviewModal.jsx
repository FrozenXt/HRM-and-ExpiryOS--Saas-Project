// src/components/ResignationReviewModal.jsx
// Admin / HR: approve or reject a pending resignation.
import { useState } from "react";
import { Icon } from "./Icon";
import { Row, Field, inputStyle } from "./FormParts";
import { reviewResignation } from "../services/resignationService";

export default function ResignationReviewModal({
  request,
  name,
  formatDate,
  onClose,
  onSaved,
}) {
  const [decision, setDecision] = useState("approved"); // approved | rejected
  const [remarks, setRemarks] = useState("");
  // Defaults to what the employee asked for; HR can change it.
  const [lastWorkingDay, setLastWorkingDay] = useState(
    request.proposedLastWorkingDay?.slice(0, 10) || "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (decision === "approved" && !lastWorkingDay) {
      setError("Please confirm the last working day.");
      return;
    }
    if (decision === "rejected" && !remarks.trim()) {
      setError("Please give a reason for rejecting.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await reviewResignation(request._id, {
        status: decision,
        remarks: remarks.trim(),
        lastWorkingDay: decision === "approved" ? lastWorkingDay : "",
      });
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
          width: 500,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="check" size={16} /> Review Resignation
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

        <div style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
          <div>
            <strong>{name}</strong> has resigned
          </div>
          <div className="muted">
            Proposed last working day:{" "}
            {formatDate(request.proposedLastWorkingDay)}
          </div>
          <div className="muted">Reason: {request.reason || "-"}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <button
              type="button"
              className={`btn ${decision === "approved" ? "primary" : ""}`}
              style={{ flex: 1 }}
              onClick={() => setDecision("approved")}
            >
              Approve
            </button>
            <button
              type="button"
              className={`btn ${decision === "rejected" ? "btn-danger" : ""}`}
              style={{ flex: 1 }}
              onClick={() => setDecision("rejected")}
            >
              Reject
            </button>
          </div>

          {decision === "approved" && (
            <Row>
              <Field label="Confirmed Last Working Day *">
                <input
                  type="date"
                  className="search-box"
                  style={inputStyle}
                  value={lastWorkingDay}
                  onChange={(e) => setLastWorkingDay(e.target.value)}
                />
              </Field>
            </Row>
          )}

          <div style={{ marginBottom: 14 }}>
            <Field
              label={`Remarks${decision === "rejected" ? " *" : " (optional)"}`}
            >
              <textarea
                className="search-box"
                style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Field>
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
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting
                ? "Saving..."
                : decision === "approved"
                  ? "Confirm Approval"
                  : "Confirm Rejection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
