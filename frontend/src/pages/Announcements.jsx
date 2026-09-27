import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import AnnouncementFormModal from "../components/AnnouncementFormModal";
import {
  getAnnouncements,
  deleteAnnouncement,
} from "../services/announcementService";
import { isSuperAdmin } from "../utils/auth";

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

const audienceBadge = {
  all: "plan-business",
  department: "plan-enterprise",
  role: "plan-pro",
};

const AUDIENCE_FILTERS = [
  { value: "all", label: "All audiences" },
  { value: "all_users", label: "Everyone" }, // careful: 'all' is reserved word, keep distinct
  { value: "department", label: "By department" },
  { value: "role", label: "By role" },
];

export default function Announcements() {
  const superAdmin = isSuperAdmin();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [modalMode, setModalMode] = useState(null); // "create" | "edit"
  const [selected, setSelected] = useState(null);

  const fetchAnnouncements = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = [];
      if (audienceFilter !== "all") {
        fields.push({
          field: "audience",
          operator: "eq",
          value: audienceFilter,
        });
      }
      const res = await getAnnouncements({
        page,
        limit: 20,
        sort: "DESC",
        sort_field: "publishedAt",
        fields,
      });
      setRows(res.data.data.data);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audienceFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.message?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const openCreate = () => {
    setSelected(null);
    setModalMode("create");
  };
  const openEdit = (a) => {
    setSelected(a);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    try {
      await deleteAnnouncement(a._id);
      fetchAnnouncements(pagination.page);
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
        <span className="current">Announcements</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Announcements</h1>
          <p>Broadcast news to everyone, specific departments, or roles.</p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          New Announcement
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="bell"
          label="Total"
          value={pagination.total}
        />
        <StatCard
          tone="green"
          icon="users"
          label="Company-wide"
          value={rows.filter((r) => r.audience === "all").length}
        />
        <StatCard
          tone="purple"
          icon="building"
          label="Department-specific"
          value={rows.filter((r) => r.audience === "department").length}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>All Announcements</h2>
            <p>Everything posted to your company.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search by title or message..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="lang-btn"
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              aria-label="Filter by audience"
            >
              <option value="all">All audiences</option>
              <option value="department">By department</option>
              <option value="role">By role</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading announcements...
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
                    <th>Title & Message</th>
                    <th>Audience</th>
                    <th>Department</th>
                    <th>Posted By</th>
                    <th>Published</th>
                    <th>Attachment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No announcements yet. Create the first one.
                      </td>
                    </tr>
                  )}
                  {filtered.map((a, i) => {
                    const poster = a.postedBy;
                    const posterName = poster
                      ? `${poster.firstName || ""} ${
                          poster.lastName || ""
                        }`.trim()
                      : "-";
                    return (
                      <tr key={a._id}>
                        <td>{from + i}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{a.title}</div>
                          <div
                            className="muted"
                            style={{
                              fontSize: 12,
                              maxWidth: 320,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={a.message}
                          >
                            {a.message}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              audienceBadge[a.audience] || "plan-default"
                            }`}
                          >
                            {a.audience}
                          </span>
                        </td>
                        <td>{a.departmentId?.name || "-"}</td>
                        <td>{posterName}</td>
                        <td>{formatDate(a.publishedAt)}</td>
                        <td>
                          {a.attachmentUrl ? (
                            <a
                              href={a.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm"
                            >
                              <Icon name="eye" size={13} /> View
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
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
                              onClick={() => openEdit(a)}
                            >
                              <Icon name="edit" size={13} /> Edit
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(a)}
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
                Showing {from}–{to} of {pagination.total} announcements
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchAnnouncements(pagination.page - 1)}
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
                    onClick={() => fetchAnnouncements(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchAnnouncements(pagination.page + 1)}
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
        <AnnouncementFormModal
          mode={modalMode}
          announcement={selected}
          onClose={closeModal}
          onSaved={() => fetchAnnouncements(pagination.page)}
        />
      )}
    </>
  );
}
