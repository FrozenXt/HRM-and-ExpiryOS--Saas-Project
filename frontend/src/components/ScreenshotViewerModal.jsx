import { Icon } from "./Icon";
import { assetUrl } from "../services/uploadService";

const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "-";

const Row = ({ label, children }) => (
  <div style={{ display: "flex", gap: 10, fontSize: 13, marginBottom: 6 }}>
    <span className="muted" style={{ width: 110, flexShrink: 0 }}>
      {label}
    </span>
    <span>{children}</span>
  </div>
);

export default function ScreenshotViewerModal({
  screenshot: s,
  employee,
  company,
  showEmployee,
  canManage,
  busy,
  onClose,
  onFlag,
  onDelete,
}) {
  const src = assetUrl(s.fileUrl);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
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
          width: 820,
          maxWidth: "96vw",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="eye" size={16} /> Screenshot
            {s.isFlagged && (
              <span className="badge warning" style={{ marginLeft: 10 }}>
                Flagged
              </span>
            )}
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

        <div
          style={{
            background: "var(--surface-2)",
            borderRadius: 10,
            border: "1px solid var(--border)",
            display: "grid",
            placeItems: "center",
            marginBottom: 16,
            overflow: "hidden",
          }}
        >
          <img
            src={src}
            alt="Captured screen"
            style={{
              maxWidth: "100%",
              maxHeight: "55vh",
              objectFit: "contain",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          {showEmployee && <Row label="Employee">{employee}</Row>}
          {showEmployee && company && company !== "-" && (
            <Row label="Company">{company}</Row>
          )}
          <Row label="Captured">{formatDateTime(s.capturedAt)}</Row>
          <Row label="Active app">{s.activeAppName || "-"}</Row>
          <Row label="Blurred">{s.isBlurred ? "Yes" : "No"}</Row>
          <Row label="Session">
            {s.sessionId ? String(s.sessionId).slice(-8) : "-"}
          </Row>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <a className="btn" href={src} target="_blank" rel="noreferrer">
            <Icon name="eye" size={14} /> Open original
          </a>
          {canManage && (
            <>
              <button className="btn" disabled={busy} onClick={() => onFlag(s)}>
                {s.isFlagged ? "Remove flag" : "Flag for review"}
              </button>
              <button
                className="btn btn-danger"
                disabled={busy}
                onClick={() => onDelete(s)}
              >
                <Icon name="trash" size={14} /> Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
