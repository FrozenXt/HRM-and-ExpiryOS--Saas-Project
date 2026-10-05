import { useState } from "react";
import { Icon } from "./Icon";
import {
  recordConsent,
  CURRENT_POLICY_VERSION,
} from "../services/monitoringService";

// PLACEHOLDER — replace with your company's actual monitoring policy text
// (ideally reviewed by whoever handles your legal/HR compliance).
const POLICY_POINTS = [
  "Your device agent may capture periodic screenshots while a work session is active.",
  "The name of the application in focus is recorded with each screenshot.",
  "Some screenshots may be blurred before upload.",
  "Screenshots are visible to authorized admins and HR in your company.",
];

export default function ConsentModal({ mode, onClose, onSaved }) {
  const grant = mode === "grant";
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setSubmitting(true);
      await recordConsent(grant);
      onSaved();
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
            <Icon name="shield" size={16} />{" "}
            {grant ? "Monitoring Consent" : "Revoke Monitoring Consent"}
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
          {grant ? (
            <>
              <p style={{ fontSize: 13.5, marginBottom: 10 }}>
                Please review what will be recorded (policy{" "}
                {CURRENT_POLICY_VERSION}):
              </p>
              <ul
                style={{
                  fontSize: 13,
                  paddingLeft: 20,
                  marginBottom: 14,
                  lineHeight: 1.7,
                }}
              >
                {POLICY_POINTS.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  marginBottom: 14,
                }}
              >
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span style={{ fontSize: 13 }}>
                  I have read and agree to the monitoring policy above.
                </span>
              </label>
            </>
          ) : (
            <p style={{ fontSize: 13.5, marginBottom: 14, lineHeight: 1.6 }}>
              Revoking consent stops your device from uploading new screenshots.
              This is saved as a new entry — your earlier consent records stay
              in your history. You can give consent again at any time.
            </p>
          )}

          {error && (
            <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (grant && !agreed)}
              className={`btn ${grant ? "primary" : "btn-danger"}`}
            >
              {submitting
                ? "Saving..."
                : grant
                  ? "Give Consent"
                  : "Revoke Consent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
