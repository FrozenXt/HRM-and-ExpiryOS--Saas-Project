import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { isSuperAdmin } from "../utils/auth";
import StatCard from "../components/StatCard";
import HolidayFormModal from "../components/HolidayFormModal";
import { listOptions } from "../services/employeeService";
import { getHolidays, deleteHoliday } from "../services/holidayService";

const byId = (rows) => Object.fromEntries(rows.map((r) => [r._id, r]));

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

const isUpcoming = (d) =>
  d && new Date(d) >= new Date(new Date().toDateString());

export default function Holidays() {
  const superAdmin = isSuperAdmin();
  const [holidays, setHolidays] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [lookups, setLookups] = useState({ companies: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState(
    String(new Date().getFullYear()),
  );
  const [modalMode, setModalMode] = useState(null);
  const [selected, setSelected] = useState(null);

  const loadLookups = async () => {
    if (!superAdmin) return;
    try {
      const companies = await listOptions("companies");
      setLookups({ companies: byId(companies) });
    } catch {
      /* names just fall back to "-" */
    }
  };

  const fetchHolidays = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = [];
      if (yearFilter !== "all") {
        fields.push(
          { field: "date", operator: "gte", value: `${yearFilter}-01-01` },
          { field: "date", operator: "lte", value: `${yearFilter}-12-31` },
        );
      }
      const result = await getHolidays({
        page,
        limit: 20,
        sort: "ASC",
        sort_field: "date",
        fields,
      });
      setHolidays(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    fetchHolidays(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearFilter]);

  const view = (h) => {
    const company =
      typeof h.companyId === "object"
        ? h.companyId
        : lookups.companies[h.companyId];
    return { company: company?.legalName || "-" };
  };

  const rows = useMemo(
    () => holidays.map((h) => ({ h, v: view(h) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [holidays, lookups],
  );

  const filtered = rows.filter(({ h, v }) => {
    const q = search.toLowerCase();
    return (
      h.name?.toLowerCase().includes(q) || v.company.toLowerCase().includes(q)
    );
  });

  const upcomingCount = holidays.filter((h) => isUpcoming(h.date)).length;

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1, current + 2].map(String);
  }, []);

  const openCreate = () => {
    setSelected(null);
    setModalMode("create");
  };
  const openEdit = (h) => {
    setSelected(h);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
  };

  const handleDelete = async (h) => {
    if (!window.confirm(`Delete the holiday "${h.name}"?`)) return;
    try {
      await deleteHoliday(h._id);
      fetchHolidays(pagination.page);
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
        <span>Leave Management</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Holidays</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Holidays</h1>
          <p>
            Manage the company holiday calendar.
            {!superAdmin && " You'll see holidays for your company only."}
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          Add Holiday
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="calendar"
          label="Total Holidays"
          value={pagination.total}
        />
        <StatCard
          tone="green"
          icon="clock"
          label="Upcoming (this page)"
          value={upcomingCount}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Holiday Calendar</h2>
            <p>A list of all holidays visible to your role.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search by name or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="lang-btn"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              aria-label="Filter by year"
            >
              <option value="all">All years</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading holidays...
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
                    <th>Holiday Name</th>
                    <th>Date</th>
                    {superAdmin && <th>Company</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={superAdmin ? 5 : 4}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No holidays found. Add one or change the filter.
                      </td>
                    </tr>
                  )}
                  {filtered.map(({ h, v }, i) => (
                    <tr key={h._id}>
                      <td>{h.id_int ?? from + i}</td>
                      <td>
                        <span
                          className={`badge ${isUpcoming(h.date) ? "success" : "plan-default"}`}
                          style={{ marginRight: 8 }}
                        >
                          {isUpcoming(h.date) ? "Upcoming" : "Past"}
                        </span>
                        {h.name}
                      </td>
                      <td>{formatDate(h.date)}</td>
                      {superAdmin && <td>{v.company}</td>}
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => openEdit(h)}
                          >
                            <Icon name="edit" size={13} /> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(h)}
                          >
                            <Icon name="trash" size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} holidays
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchHolidays(pagination.page - 1)}
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
                    onClick={() => fetchHolidays(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchHolidays(pagination.page + 1)}
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
        <HolidayFormModal
          mode={modalMode}
          holiday={selected}
          onClose={closeModal}
          onSaved={() => fetchHolidays(pagination.page)}
        />
      )}
    </>
  );
}
