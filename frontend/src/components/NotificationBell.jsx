import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notificationService";

const POLL_MS = 45000;

const timeAgo = (d) => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(d)) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const refreshCount = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      setUnread(res.data.data.unread);
    } catch {
      /* keep the last known count */
    }
  }, []);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getNotifications({ limit: 15 });
      setItems(res.data.data.data);
      setUnread(res.data.data.unread);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll the unread count, but only while the tab is visible.
  useEffect(() => {
    refreshCount();
    const tick = () => {
      if (document.visibilityState === "visible") refreshCount();
    };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    loadList();
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, loadList]);

  const openItem = async (n) => {
    if (!n.readAt) {
      setItems((list) =>
        list.map((x) =>
          x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x,
        ),
      );
      setUnread((c) => Math.max(0, c - 1));
      markNotificationRead(n._id).catch(() => {});
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const readAll = async () => {
    setItems((list) =>
      list.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })),
    );
    setUnread(0);
    markAllNotificationsRead().catch(() => {});
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        className="icon-btn"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ position: "relative" }}
      >
        <Icon name="bell" size={19} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: "0 5px",
              borderRadius: 999,
              background: "var(--red, #ef4444)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              lineHeight: "18px",
              textAlign: "center",
              boxSizing: "border-box",
              pointerEvents: "none",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="profile-menu"
          style={{ width: 340, maxHeight: 440, overflow: "auto", right: 0 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <strong style={{ fontSize: 14 }}>Notifications</strong>
            {unread > 0 && (
              <button
                type="button"
                onClick={readAll}
                style={{
                  background: "none",
                  border: 0,
                  color: "var(--blue)",
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {loading && items.length === 0 ? (
            <div className="muted" style={{ padding: 18, fontSize: 13 }}>
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="muted" style={{ padding: 18, fontSize: 13 }}>
              You're all caught up.
            </div>
          ) : (
            items.map((n) => (
              <button
                type="button"
                key={n._id}
                onClick={() => openItem(n)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  border: 0,
                  borderBottom: "1px solid var(--border)",
                  background: n.readAt ? "transparent" : "var(--surface-2)",
                  cursor: "pointer",
                  color: "var(--text)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    style={{ fontSize: 13, fontWeight: n.readAt ? 500 : 700 }}
                  >
                    {n.title}
                  </span>
                  <span
                    className="muted"
                    style={{ fontSize: 11, whiteSpace: "nowrap" }}
                  >
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                {n.message && (
                  <div
                    className="muted"
                    style={{ fontSize: 12.5, marginTop: 3 }}
                  >
                    {n.message}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
