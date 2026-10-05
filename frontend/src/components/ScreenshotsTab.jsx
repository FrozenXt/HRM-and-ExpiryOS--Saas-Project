import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import StatCard from "./StatCard";
import ScreenshotViewerModal from "./ScreenshotViewerModal";
import useEmployeeLookups from "../hooks/useEmployeeLookups";
import { getCurrentUser } from "../utils/auth";
import { assetUrl } from "../services/uploadService";
import {
  getScreenshots,
  flagScreenshot,
  deleteScreenshot,
} from "../services/monitoringService";

const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const PAGE_SIZE = 12;

function Thumb({ src }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          color: "var(--text-dim)",
        }}
      >
        <Icon name="eye" size={22} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt="Screenshot thumbnail"
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

export default function ScreenshotsTab() {
  const role = getCurrentUser()?.role;
  const isStaff = role === "staff";
  const superAdmin = role === "super_admin";
  // Assumption: only admin/hr/super_admin can flag or delete; staff view only.
  const canManage = ["super_admin", "admin", "hr"].includes(role);
  const { employeeName, companyName } = useEmployeeLookups();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [flagFilter, setFlagFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [viewing, setViewing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchRows = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = [];
      if (flagFilter === "flagged") {
        fields.push({ field: "isFlagged", operator: "eq", value: true });
      }
      if (dateFilter) {
        const start = new Date(`${dateFilter}T00:00:00`);
        const end = new Date(`${dateFilter}T23:59:59.999`);
        fields.push(
          { field: "capturedAt", operator: "gte", value: start.toISOString() },
          { field: "capturedAt", operator: "lte", value: end.toISOString() },
        );
      }
      const result = await getScreenshots({ page, limit: PAGE_SIZE, fields });
      setRows(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagFilter, dateFilter]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(
      (s) =>
        !q ||
        employeeName(s.employeeId).toLowerCase().includes(q) ||
        (s.activeAppName || "").toLowerCase().includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, employeeName]);

  const flaggedCount = rows.filter((s) => s.isFlagged).length;
  const blurredCount = rows.filter((s) => s.isBlurred).length;

  const handleFlag = async (s) => {
    try {
      setBusyId(s._id);
      setActionError("");
      await flagScreenshot(s._id, !s.isFlagged);
      const next = { ...s, isFlagged: !s.isFlagged };
      setRows((rs) => rs.map((r) => (r._id === s._id ? next : r)));
      setViewing((v) => (v?._id === s._id ? next : v));
    } catch (err) {
      setActionError(err.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm("Delete this screenshot permanently?")) return;
    try {
      setBusyId(s._id);
      setActionError("");
      await deleteScreenshot(s._id);
      setViewing(null);
      fetchRows(pagination.page);
    } catch (err) {
      setActionError(err.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const from = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <>
      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="eye"
          label="Total Screenshots"
          value={pagination.total}
        />
        <StatCard
          tone="orange"
          icon="shield"
          label="Flagged (this page)"
          value={flaggedCount}
        />
        <StatCard
          tone="purple"
          icon="activity"
          label="Blurred (this page)"
          value={blurredCount}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{isStaff ? "My Screenshots" : "Screenshots"}</h2>
            <p>
              Most recent captures first. Click a thumbnail to view it full
              size.
            </p>
          </div>
          <div className="panel-tools">
            {!isStaff && (
              <div className="search-box">
                <Icon name="search" size={16} />
                <input
                  type="text"
                  placeholder="Search employee or app..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
            <input
              type="date"
              className="lang-btn"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by date"
            />
            <select
              className="lang-btn"
              value={flagFilter}
              onChange={(e) => setFlagFilter(e.target.value)}
              aria-label="Filter by flag"
            >
              <option value="all">All screenshots</option>
              <option value="flagged">Flagged only</option>
            </select>
            {dateFilter && (
              <button className="btn btn-sm" onClick={() => setDateFilter("")}>
                Clear date
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <div
            style={{ color: "var(--red)", fontSize: 13, padding: "10px 20px" }}
          >
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading screenshots...
          </div>
        ) : error ? (
          <div style={{ color: "var(--red)", padding: "24px 0" }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div className="muted" style={{ textAlign: "center", padding: 32 }}>
            No screenshots found. They appear here once an employee with
            monitoring consent has an active session.
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 16,
                padding: "4px 20px 20px",
              }}
            >
              {filtered.map((s) => (
                <div
                  key={s._id}
                  onClick={() => setViewing(s)}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    overflow: "hidden",
                    cursor: "pointer",
                    background: "var(--surface-2)",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      aspectRatio: "16 / 10",
                      background: "var(--surface-2)",
                    }}
                  >
                    <Thumb src={assetUrl(s.fileUrl)} />
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        display: "flex",
                        gap: 6,
                      }}
                    >
                      {s.isFlagged && (
                        <span className="badge warning">Flagged</span>
                      )}
                      {s.isBlurred && (
                        <span className="badge plan-default">Blurred</span>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    {!isStaff && (
                      <div style={{ fontWeight: 500, fontSize: 13.5 }}>
                        {employeeName(s.employeeId)}
                      </div>
                    )}
                    <div className="muted" style={{ fontSize: 12 }}>
                      {formatDateTime(s.capturedAt)}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        marginTop: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={s.activeAppName || ""}
                    >
                      {s.activeAppName || "No app recorded"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} screenshots
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchRows(pagination.page - 1)}
                  aria-label="Previous page"
                >
                  <Icon name="chevronLeft" size={14} />
                </button>
                {Array.from(
                  { length: pagination.total_pages || 1 },
                  (_, n) => n + 1,
                ).map((p) => (
                  <button
                    key={p}
                    className={p === pagination.page ? "active" : ""}
                    onClick={() => fetchRows(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchRows(pagination.page + 1)}
                  aria-label="Next page"
                >
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {viewing && (
        <ScreenshotViewerModal
          screenshot={viewing}
          employee={employeeName(viewing.employeeId)}
          company={superAdmin ? companyName(viewing.companyId) : null}
          showEmployee={!isStaff}
          canManage={canManage}
          busy={busyId === viewing._id}
          onClose={() => setViewing(null)}
          onFlag={handleFlag}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
