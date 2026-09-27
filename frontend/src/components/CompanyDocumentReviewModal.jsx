import { useState } from "react";
import { Icon } from "./Icon";
import { reviewCompanyDocument } from "../services/companyDocumentService";

export default function CompanyDocumentReviewModal({
  document,
  onClose,
  onSaved,
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const decide = async (approved) => {
    setError("");
    try {
      setBusy(true);
      await reviewCompanyDocument(document._id, {
        approved,
        note: note.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to submit review",
      );
    } finally {
      setBusy(false);
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
        style={{ width: 440, maxWidth: "95vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="userCheck" size={16} /> Review Document
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

        <p className="muted" style={{ fontSize: 13.5, margin: "-4px 0 16px" }}>
          {document.fileName}
        </p>

        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontSize: 12.5,
            color: "var(--text-dim)",
          }}
        >
          Note (optional)
        </label>
        <textarea
          className="search-box"
          style={{
            width: "100%",
            padding: "9px 12px",
            minHeight: 80,
            resize: "vertical",
            marginBottom: 14,
          }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason for rejection, or any remarks"
        />

        {error && (
          <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => decide(false)}
            disabled={busy}
          >
            Reject
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => decide(true)}
            disabled={busy}
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
