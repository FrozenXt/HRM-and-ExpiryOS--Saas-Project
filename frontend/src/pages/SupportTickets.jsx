// src/pages/SupportTickets.jsx
//
// API use: one list call per page/filter change (it also returns the summary
// counts), one options call on mount, and one get call when a ticket is opened.
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import SupportTicketFormModal from "../components/SupportTicketFormModal";
import SupportTicketDetailModal from "../components/SupportTicketDetailModal";
import { getCurrentUser } from "../utils/auth";
import {
  getSupportTickets,
  getTicketOptions,
} from "../services/supportTicketService";
import {
  label,
  timeAgo,
  STATUS_BADGE,
  PRIORITY_STYLE,
} from "../utils/supportTicketUtils";

const EMPTY_SUMMARY = {
  total: 0,
  open: 0,
  resolved: 0,
  closed: 0,
  unassigned: 0,
  urgent: 0,
};

export default function SupportTickets() {
  const role = getCurrentUser()?.role;
  const showRequester = role !== "staff"; // staff only ever see their own

  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [options, setOptions] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    category: "all",
  });
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    getTicketOptions()
      .then((res) => setOptions(res.data.data))
      .catch(() => {
        /* dropdowns stay empty; the list still works */
      });
  }, []);

  const fetchTickets = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const fields = Object.entries(filters)
        .filter(([, v]) => v !== "all")
        .map(([field, value]) => ({ field, operator: "eq", value }));

      const result = await getSupportTickets({ page, limit: 20, fields });
      const d = result.data.data;
      setTickets(d.data);
      setPagination(d.pagination);
      setSummary(d.summary || EMPTY_SUMMARY);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const setFilter = (key) => (e) =>
    setFilters((f) => ({ ...f, [key]: e.target.value }));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter(
      (t) =>
        t.ticketNo?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q) ||
        t.requester?.name?.toLowerCase().includes(q),
    );
  }, [tickets, search]);

  const from = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);
  const colCount = showRequester ? 8 : 7;

  const optionList = (key) => options?.[key] || [];

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Support Tickets</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Support Tickets</h1>
          <p>
            {role === "super_admin"
              ? "Tickets raised by company admins and HR."
              : role === "staff"
                ? "Raise a ticket and follow the replies."
                : "Tickets from your company, and your own."}
          </p>
        </div>
        {options?.canCreate && (
          <button className="btn primary" onClick={() => setShowForm(true)}>
            <Icon name="plusCircle" size={17} />
            New Ticket
          </button>
        )}
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="headphones"
          label="Total"
          value={summary.total}
        />
        <StatCard
          tone="orange"
          icon="clock"
          label="Open"
          value={summary.open}
        />
        <StatCard
          tone="orange"
          icon="users"
          label="Unassigned"
          value={summary.unassigned}
        />
        <StatCard
          tone="red"
          icon="bell"
          label="Urgent"
          value={summary.urgent}
        />
        <StatCard
          tone="green"
          icon="check"
          label="Resolved"
          value={summary.resolved}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Tickets</h2>
            <p>Most recent activity first.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="lang-btn"
              value={filters.status}
              onChange={setFilter("status")}
              aria-label="Filter by status"
            >
              <option value="all">Status: All</option>
              {optionList("statuses").map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
            <select
              className="lang-btn"
              value={filters.priority}
              onChange={setFilter("priority")}
              aria-label="Filter by priority"
            >
              <option value="all">Priority: All</option>
              {optionList("priorities").map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
            <select
              className="lang-btn"
              value={filters.category}
              onChange={setFilter("category")}
              aria-label="Filter by category"
            >
              <option value="all">Category: All</option>
              {optionList("categories").map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading tickets...
          </div>
        ) : error ? (
          <div style={{ color: "var(--red)", padding: "24px 0" }}>{error}</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Subject</th>
                    {showRequester && <th>Requester</th>}
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={colCount}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No tickets found.
                      </td>
                    </tr>
                  )}
                  {filtered.map((t) => (
                    <tr
                      key={t._id}
                      onClick={() => setOpenId(t._id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{t.ticketNo}</td>
                      <td style={{ maxWidth: 280 }}>
                        <div
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={t.subject}
                        >
                          {t.subject}
                        </div>
                        <div
                          className="muted"
                          style={{ fontSize: 12, fontWeight: 400 }}
                        >
                          {t.commentCount || 0} repl
                          {t.commentCount === 1 ? "y" : "ies"}
                          {t.attachmentCount
                            ? ` · ${t.attachmentCount} file${t.attachmentCount === 1 ? "" : "s"}`
                            : ""}
                        </div>
                      </td>
                      {showRequester && (
                        <td>
                          <div>{t.requester?.name || "-"}</div>
                          {t.company?.name && role === "super_admin" && (
                            <div
                              className="muted"
                              style={{ fontSize: 12, fontWeight: 400 }}
                            >
                              {t.company.name}
                            </div>
                          )}
                        </td>
                      )}
                      <td>{label(t.category)}</td>
                      <td style={PRIORITY_STYLE[t.priority]}>
                        {label(t.priority)}
                      </td>
                      <td>
                        <span
                          className={`badge ${STATUS_BADGE[t.status] || "plan-default"}`}
                        >
                          {label(t.status)}
                        </span>
                      </td>
                      <td>
                        {t.assignee?.name || (
                          <span className="muted">Unassigned</span>
                        )}
                      </td>
                      <td>{timeAgo(t.lastActivityAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} tickets
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchTickets(pagination.page - 1)}
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
                    onClick={() => fetchTickets(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchTickets(pagination.page + 1)}
                  aria-label="Next page"
                >
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {showForm && (
        <SupportTicketFormModal
          options={options}
          onClose={() => setShowForm(false)}
          onSaved={() => fetchTickets(1)}
        />
      )}

      {openId && (
        <SupportTicketDetailModal
          ticketId={openId}
          options={options}
          onClose={() => setOpenId(null)}
          onChanged={() => fetchTickets(pagination.page)}
        />
      )}
    </>
  );
}
