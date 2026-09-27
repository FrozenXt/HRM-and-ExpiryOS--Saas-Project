import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import EventFormModal from "../components/EventFormModal";
import { getEvents, deleteEvent } from "../services/eventService";

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

const typeBadge = {
  birthday: "success",
  work_anniversary: "plan-business",
  company_event: "plan-enterprise",
  meeting: "plan-pro",
  other: "plan-default",
};

const TYPE_LABELS = {
  birthday: "Birthday",
  work_anniversary: "Work Anniversary",
  company_event: "Company Event",
  meeting: "Meeting",
  other: "Other",
};

const TYPE_FILTERS = [
  { value: "all", label: "All types" },
  { value: "birthday", label: "Birthdays" },
  { value: "work_anniversary", label: "Anniversaries" },
  { value: "company_event", label: "Company Events" },
  { value: "meeting", label: "Meetings" },
  { value: "other", label: "Other" },
];

export default function Events() {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modalMode, setModalMode] = useState(null); // "create" | "edit" | null
  const [selected, setSelected] = useState(null);

  const fetchEvents = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = [];
      if (typeFilter !== "all") {
        fields.push({ field: "type", operator: "eq", value: typeFilter });
      }
      const res = await getEvents({
        page,
        limit: 20,
        sort: "ASC",
        sort_field: "date",
        fields,
      });
      setEvents(res.data.data.data);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => {
      const empName = `${e.employeeId?.userId?.firstName || ""} ${
        e.employeeId?.userId?.lastName || ""
      }`.trim();
      return (
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        empName.toLowerCase().includes(q)
      );
    });
  }, [events, search]);

  const todayCount = events.filter(
    (e) => new Date(e.date).toDateString() === new Date().toDateString(),
  ).length;
  const upcomingCount = events.filter(
    (e) => new Date(e.date) > new Date(),
  ).length;

  const openCreate = () => {
    setSelected(null);
    setModalMode("create");
  };
  const openEdit = (e) => {
    setSelected(e);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
  };

  const handleDelete = async (e) => {
    if (!window.confirm(`Delete "${e.title}"? This cannot be undone.`)) return;
    try {
      await deleteEvent(e._id);
      fetchEvents(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const from = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Events</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Events &amp; Engagement</h1>
          <p>Birthdays, work anniversaries, company events and meetings.</p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          Create Event
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="calendar"
          label="Total Events"
          value={pagination.total}
        />
        <StatCard tone="green" icon="clock" label="Today" value={todayCount} />
        <StatCard
          tone="purple"
          icon="userPlus"
          label="Upcoming"
          value={upcomingCount}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>All Events</h2>
            <p>Company-wide schedule of birthdays, anniversaries and events.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search by title, description or employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="lang-btn"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by type"
            >
              {TYPE_FILTERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading events...
          </div>
        ) : error ? (
          <div style={{ color: "var(--red)", padding: "24px 0" }}>{error}</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Recurring</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No events found. Create one or change the filter.
                      </td>
                    </tr>
                  )}
                  {filtered.map((e, i) => {
                    const emp = e.employeeId;
                    const empName = emp
                      ? `${emp.userId?.firstName || ""} ${
                          emp.userId?.lastName || ""
                        }`.trim()
                      : "-";
                    return (
                      <tr key={e._id}>
                        <td>{from + i}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{e.title}</div>
                          {e.description && (
                            <div
                              className="muted"
                              style={{
                                fontSize: 12,
                                maxWidth: 260,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {e.description}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              typeBadge[e.type] || "plan-default"
                            }`}
                          >
                            {TYPE_LABELS[e.type] || e.type}
                          </span>
                        </td>
                        <td>{empName || "-"}</td>
                        <td>{formatDate(e.date)}</td>
                        <td>{e.isRecurringYearly ? "Yes" : "No"}</td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              className="btn btn-sm"
                              onClick={() => openEdit(e)}
                            >
                              <Icon name="edit" size={13} /> Edit
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(e)}
                            >
                              <Icon name="trash" size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} events
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchEvents(pagination.page - 1)}
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
                    onClick={() => fetchEvents(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchEvents(pagination.page + 1)}
                  aria-label="Next page"
                >
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {modalMode && (
        <EventFormModal
          mode={modalMode}
          event={selected}
          onClose={closeModal}
          onSaved={() => fetchEvents(pagination.page)}
        />
      )}
    </>
  );
}
