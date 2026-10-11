// src/components/SupportTicketDetailModal.jsx
// One ticket: details, attachments, conversation, history, reply, and the
// actions this user is allowed to take (the server sends `permissions`).
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Field, inputStyle } from "./FormParts";
import { FILE_BASE } from "../config";
import {
  getSupportTicket,
  addTicketComment,
  updateSupportTicket,
  deleteSupportTicket,
} from "../services/supportTicketService";
import {
  label,
  formatDateTime,
  checkFiles,
  STATUS_BADGE,
  PRIORITY_STYLE,
  MAX_FILES,
} from "../utils/supportTicketUtils";

const errMsg = (err) =>
  err.response?.data?.message || err.message || "Something went wrong";

function Attachments({ items }) {
  if (!items?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
      {items.map((a) => (
        <a
          key={a._id || a.fileUrl}
          href={`${FILE_BASE}${a.fileUrl}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-sm"
        >
          <Icon name="file" size={13} /> {a.fileName}
        </a>
      ))}
    </div>
  );
}

export default function SupportTicketDetailModal({
  ticketId,
  options,
  onClose,
  onChanged,
}) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [message, setMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  // Responder controls
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const load = async () => {
    try {
      const res = await getSupportTicket(ticketId);
      const t = res.data.data;
      setTicket(t);
      setStatus(t.status);
      setPriority(t.priority);
      setAssigneeId(t.assignee?._id || "");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  // Run an action, then refresh this ticket and the list behind it.
  const run = async (fn) => {
    setError("");
    try {
      setBusy(true);
      await fn();
      await load();
      onChanged();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const onPickFiles = (e) => {
    const next = [...files, ...Array.from(e.target.files || [])];
    e.target.value = "";
    const problem = checkFiles(next);
    if (problem) return setError(problem);
    setError("");
    setFiles(next);
  };

  const sendReply = (e) => {
    e.preventDefault();
    if (!message.trim() && files.length === 0) {
      setError("Write a message or attach a file.");
      return;
    }
    run(async () => {
      await addTicketComment(
        ticketId,
        { message: message.trim(), isInternal: isInternal ? "true" : "" },
        files,
      );
      setMessage("");
      setIsInternal(false);
      setFiles([]);
    });
  };

  const saveChanges = () => {
    const payload = {};
    if (status !== ticket.status) payload.status = status;
    if (priority !== ticket.priority) payload.priority = priority;
    if (assigneeId !== (ticket.assignee?._id || ""))
      payload.assigneeId = assigneeId || null;
    if (Object.keys(payload).length === 0) return;
    run(() => updateSupportTicket(ticketId, payload));
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Delete ticket ${ticket.ticketNo}? This cannot be undone.`,
      )
    )
      return;
    try {
      setBusy(true);
      await deleteSupportTicket(ticketId);
      onChanged();
      onClose();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  const p = ticket?.permissions || {};
  const canEdit = p.canChangeStatus || p.canAssign;
  const isClosed = ticket?.status === "closed";
  const dirty =
    ticket &&
    (status !== ticket.status ||
      priority !== ticket.priority ||
      assigneeId !== (ticket.assignee?._id || ""));

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
          width: 720,
          maxWidth: "95vw",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="headphones" size={16} />{" "}
            {ticket ? `${ticket.ticketNo} · ${ticket.subject}` : "Ticket"}
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

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading ticket...
          </div>
        ) : !ticket ? (
          <div style={{ color: "var(--red)", padding: "24px 0" }}>{error}</div>
        ) : (
          <>
            {/* ---- summary ---- */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span
                className={`badge ${STATUS_BADGE[ticket.status] || "plan-default"}`}
              >
                {label(ticket.status)}
              </span>
              <span style={PRIORITY_STYLE[ticket.priority]}>
                {label(ticket.priority)} priority
              </span>
              <span className="muted">· {label(ticket.category)}</span>
              <span className="muted">
                · {ticket.requester?.name} ({label(ticket.requesterRole || "")})
              </span>
              <span className="muted">
                · opened {formatDateTime(ticket.createdAt)}
              </span>
              {ticket.assignee && (
                <span className="muted">
                  · assigned to {ticket.assignee.name}
                </span>
              )}
            </div>

            <div
              style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6 }}
            >
              {ticket.description}
            </div>
            <Attachments items={ticket.attachments} />

            {ticket.resolutionNote && (
              <p style={{ fontSize: 13, marginTop: 12 }}>
                <strong>Resolution:</strong> {ticket.resolutionNote}
              </p>
            )}

            {/* ---- responder controls ---- */}
            {canEdit && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "flex-end",
                  margin: "16px 0",
                  padding: 12,
                  border: "1px solid var(--border, rgba(128,128,128,.25))",
                  borderRadius: 10,
                }}
              >
                {p.canChangeStatus && (
                  <>
                    <Field label="Status">
                      <select
                        className="search-box"
                        style={inputStyle}
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        {(options?.statuses || []).map((s) => (
                          <option key={s} value={s}>
                            {label(s)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Priority">
                      <select
                        className="search-box"
                        style={inputStyle}
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                      >
                        {(options?.priorities || []).map((s) => (
                          <option key={s} value={s}>
                            {label(s)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}
                {p.canAssign && (
                  <Field label="Assignee">
                    <select
                      className="search-box"
                      style={inputStyle}
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {(options?.assignees || []).map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name ||
                            `${a.firstName || ""} ${a.lastName || ""}`.trim() ||
                            a.email}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <button
                  type="button"
                  className="btn primary"
                  disabled={!dirty || busy}
                  onClick={saveChanges}
                >
                  Save Changes
                </button>
              </div>
            )}

            {/* ---- conversation ---- */}
            <h3 style={{ margin: "18px 0 8px", fontSize: 14 }}>
              Conversation ({ticket.comments?.length || 0})
            </h3>
            {(ticket.comments || []).length === 0 && (
              <div className="muted" style={{ fontSize: 13 }}>
                No replies yet.
              </div>
            )}
            {(ticket.comments || []).map((c, i) => {
              const who = c.by || c.author || c.user || {};
              return (
                <div
                  key={c._id || i}
                  style={{
                    padding: "10px 12px",
                    marginBottom: 8,
                    borderRadius: 10,
                    border: "1px solid var(--border, rgba(128,128,128,.25))",
                    background: c.isInternal
                      ? "rgba(245,158,11,.12)"
                      : "transparent",
                  }}
                >
                  <div style={{ fontSize: 12.5 }} className="muted">
                    <strong style={{ color: "inherit" }}>
                      {who.name || "-"}
                    </strong>
                    {who.role ? ` (${label(who.role)})` : ""} ·{" "}
                    {formatDateTime(c.createdAt || c.at)}
                    {c.isInternal ? " · internal note" : ""}
                  </div>
                  {c.message && (
                    <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
                      {c.message}
                    </div>
                  )}
                  <Attachments items={c.attachments} />
                </div>
              );
            })}

            {/* ---- reply ---- */}
            {p.canReply && !isClosed && (
              <form onSubmit={sendReply} style={{ marginTop: 12 }}>
                <textarea
                  className="search-box"
                  style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                  placeholder="Write a reply..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "center",
                    margin: "8px 0",
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    onChange={onPickFiles}
                    disabled={files.length >= MAX_FILES}
                  />
                  {p.canAddInternalNote && (
                    <label style={{ fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                      />{" "}
                      Internal note (requester can't see it)
                    </label>
                  )}
                </div>
                {files.length > 0 && (
                  <div
                    className="muted"
                    style={{ fontSize: 12.5, marginBottom: 8 }}
                  >
                    {files.map((f) => f.name).join(", ")}{" "}
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setFiles([])}
                    >
                      Clear
                    </button>
                  </div>
                )}
                <button type="submit" className="btn primary" disabled={busy}>
                  {busy ? "Sending..." : isInternal ? "Add Note" : "Send Reply"}
                </button>
              </form>
            )}
            {isClosed && (
              <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
                This ticket is closed.
              </p>
            )}

            {/* ---- history ---- */}
            {(ticket.history || []).length > 0 && (
              <>
                <h3 style={{ margin: "20px 0 8px", fontSize: 14 }}>History</h3>
                {ticket.history.map((h, i) => (
                  <div
                    key={h._id || i}
                    className="muted"
                    style={{ fontSize: 12.5, padding: "3px 0" }}
                  >
                    {formatDateTime(h.at)} · {h.by?.name || "-"} ·{" "}
                    {label(h.action)}
                    {h.to
                      ? ` (${h.from ? `${label(h.from)} → ` : ""}${label(String(h.to))})`
                      : ""}
                  </div>
                ))}
              </>
            )}

            {error && (
              <p style={{ color: "var(--red)", fontSize: 13, marginTop: 14 }}>
                {error}
              </p>
            )}

            {/* ---- footer actions ---- */}
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "space-between",
                marginTop: 18,
              }}
            >
              <div style={{ display: "flex", gap: 10 }}>
                {p.canClose && !isClosed && (
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      window.confirm("Close this ticket?") &&
                      run(() =>
                        updateSupportTicket(ticketId, { status: "closed" }),
                      )
                    }
                  >
                    Close Ticket
                  </button>
                )}
                {p.canReopen && (
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        updateSupportTicket(ticketId, { status: "open" }),
                      )
                    }
                  >
                    Reopen
                  </button>
                )}
                {p.canDelete && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={busy}
                    onClick={handleDelete}
                  >
                    <Icon name="trash" size={14} /> Delete
                  </button>
                )}
              </div>
              <button type="button" className="btn" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
