import { useState } from "react";
import { Icon } from "./Icon";
import { Row, Field, inputStyle } from "./FormParts";
import { returnAssetAssignment } from "../services/assetService";

const CONDITIONS = ["good", "damaged", "lost"];
const readableLabel = (v = "") => v[0]?.toUpperCase() + v.slice(1);

export default function ReturnAssetModal({ assignment, onClose, onSaved }) {
  const [returnedDate, setReturnedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [condition, setCondition] = useState("good");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setSubmitting(true);
      const result = await returnAssetAssignment(assignment._id, {
        returnedDate,
        condition,
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
        style={{ width: 440, maxWidth: "95vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="chevronLeft" size={16} /> Mark Asset Returned
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
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
            Returning <strong>{assignment.assetId?.name}</strong> (
            {assignment.assetId?.assetTag}). A "damaged" or "lost" condition
            sends it to under-repair status instead of available.
          </p>
          <Row>
            <Field label="Return Date *">
              <input
                type="date"
                className="search-box"
                style={inputStyle}
                value={returnedDate}
                onChange={(e) => setReturnedDate(e.target.value)}
              />
            </Field>
            <Field label="Condition *">
              <select
                className="search-box"
                style={inputStyle}
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {readableLabel(c)}
                  </option>
                ))}
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
              {submitting ? "Saving..." : "Mark Returned"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
