import { useCallback, useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import { listOptions } from "../services/employeeService";
import { getCurrentUser } from "../utils/auth";
import {
  getBackups,
  getBackupStatus,
  runBackup,
  deleteBackup,
  downloadBackup,
} from "../services/backupService";

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";
const fmtSize = (b = 0) =>
  b < 1024
    ? `${b} B`
    : b < 1048576
      ? `${(b / 1024).toFixed(1)} KB`
      : `${(b / 1048576).toFixed(1)} MB`;
const fmtDuration = (ms = 0) =>
  ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
const BADGE = {
  success: "success",
  failed: "warning",
  running: "plan-business",
  expired: "plan-default",
};

export default function Backups() {
  const superAdmin = getCurrentUser()?.role === "super_admin";

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    total_pages: 1,
  });
  const [status, setStatus] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [scope, setScope] = useState("full");
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const [list, st] = await Promise.all([
        getBackups({ page, limit: 15 }),
        getBackupStatus(),
      ]);
      setRows(list.data.data.data);
      setPagination(list.data.data.pagination);
      setStatus(st.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    if (superAdmin)
      listOptions("companies")
        .then(setCompanies)
        .catch(() => {});
  }, [superAdmin]);

  const run = async () => {
    setError("");
    setMsg("");
    if (superAdmin && scope === "company" && !companyId) {
      setError("Choose a company for a company backup.");
      return;
    }
    try {
      setBusy(true);
      await runBackup(
        superAdmin
          ? { scope, companyId: scope === "company" ? companyId : undefined }
          : {},
      );
      setMsg("Backup completed and verified.");
      load(1);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      load(1);
    } finally {
      setBusy(false);
    }
  };

  const download = async (row) => {
    try {
      const res = await downloadBackup(row._id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = row.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed. The file may have been removed.");
    }
  };

  const remove = async (row) => {
    if (!window.confirm("Delete this backup permanently?")) return;
    try {
      await deleteBackup(row._id);
      load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Backups</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Backups</h1>
          <p>
            {superAdmin
              ? "A full database backup runs automatically every day. You can also run one now."
              : "Download a backup of your company's data."}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {superAdmin && (
            <select
              className="lang-btn"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="full">Full database</option>
              <option value="company">One company</option>
            </select>
          )}
          {superAdmin && scope === "company" && (
            <select
              className="lang-btn"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">Select a company...</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.legalName}
                </option>
              ))}
            </select>
          )}
          <button className="btn primary" disabled={busy} onClick={run}>
            <Icon name="fileText" size={16} />{" "}
            {busy ? "Backing up..." : "Back up now"}
          </button>
        </div>
      </div>

      {status?.fullBackupOverdue && (
        <div
          className="badge warning"
          style={{
            display: "block",
            padding: 12,
            whiteSpace: "normal",
            marginBottom: 16,
          }}
        >
          No successful full backup in the last 26 hours. Check the server log
          for the scheduled job.
        </div>
      )}
      {status?.lastFailed && (
        <div
          className="badge warning"
          style={{
            display: "block",
            padding: 12,
            whiteSpace: "normal",
            marginBottom: 16,
          }}
        >
          The last backup failed ({fmtDateTime(status.lastFailed.createdAt)}):{" "}
          {status.lastFailed.error}
        </div>
      )}
      {error && (
        <div style={{ color: "var(--red)", marginBottom: 12 }}>{error}</div>
      )}
      {msg && (
        <div style={{ color: "var(--green)", marginBottom: 12 }}>{msg}</div>
      )}

      {status && (
        <div className="stat-grid">
          <StatCard
            tone="green"
            icon="check"
            label="Last successful backup"
            value={
              status.lastSuccess
                ? fmtDateTime(status.lastSuccess.createdAt)
                : "None yet"
            }
          />
          <StatCard
            tone="blue"
            icon="fileText"
            label="Stored backups"
            value={status.storedFiles}
          />
          <StatCard
            tone="purple"
            icon="activity"
            label="Space used"
            value={fmtSize(status.storedBytes)}
          />
          <StatCard
            tone="orange"
            icon="clock"
            label="Kept for"
            value={`${status.retentionDays} days`}
          />
        </div>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Backup history</h2>
            <p>
              {superAdmin
                ? `Scheduled: ${status?.schedule || "-"} (${status?.timezone || ""})`
                : "Includes your company's records. Passwords and mail credentials are removed."}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading...
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  {superAdmin && <th>Company</th>}
                  <th>Trigger</th>
                  <th>Records</th>
                  <th>Size</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={superAdmin ? 9 : 8}
                      className="muted"
                      style={{ textAlign: "center", padding: 24 }}
                    >
                      No backups yet.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r._id}>
                    <td>{fmtDateTime(r.createdAt)}</td>
                    <td>{r.scope === "full" ? "Full database" : "Company"}</td>
                    {superAdmin && (
                      <td>
                        {r.companyId
                          ? r.companyId.tradeName || r.companyId.legalName
                          : "All"}
                      </td>
                    )}
                    <td>
                      {r.trigger === "scheduled"
                        ? "Automatic"
                        : `Manual${r.createdBy ? ` · ${r.createdBy.firstName}` : ""}`}
                    </td>
                    <td>{r.documents.toLocaleString()}</td>
                    <td>{fmtSize(r.sizeBytes)}</td>
                    <td>{fmtDuration(r.durationMs)}</td>
                    <td>
                      <span
                        className={`badge ${BADGE[r.status] || "plan-default"}`}
                        title={r.error || ""}
                      >
                        {r.status === "success" && r.verified
                          ? "Verified"
                          : r.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        {r.status === "success" && r.fileName && (
                          <button
                            className="btn btn-sm"
                            onClick={() => download(r)}
                          >
                            <Icon name="fileText" size={13} /> Download
                          </button>
                        )}
                        {superAdmin && r.status !== "running" && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => remove(r)}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <span>
            Page {pagination.page} of {pagination.total_pages || 1}
          </span>
          <div className="pager">
            <button
              disabled={pagination.page <= 1}
              onClick={() => load(pagination.page - 1)}
            >
              <Icon name="chevronLeft" size={14} />
            </button>
            <button
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => load(pagination.page + 1)}
            >
              <Icon name="chevronRight" size={14} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
